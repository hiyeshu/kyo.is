#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 src/mastra/tools/kyoItemsTool 与 ./test-utils，使用 mock Supabase query builder
 * [OUTPUT]: runKyoItemToolTests，验证 agent item tools 的搜索、输入契约、桌面便签验证闭环、用户作用域、clientEffects 与写入 payload
 * [POS]: tests/ 的 Mastra 工具契约套件，不需要真实 Supabase session 或 DeepSeek key
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createDesktopStickyTool,
  createDeleteKyoItemTool,
  createReorderKyoItemsTool,
  createSearchKyoItemsTool,
  createUpdateKyoItemTool,
  createUpsertKyoItemTool,
} from "../src/mastra/tools/kyoItemsTool";
import type { ToolTraceEntry } from "../src/server/types";
import {
  assert,
  assertEq,
  clearResults,
  printSummary,
  runTest,
  section,
} from "./test-utils";

type MockResponse = { data: unknown; error: Error | null };
type MockCall = {
  table: string;
  method: string;
  args?: unknown[];
  payload?: Record<string, unknown>;
};
type MockState = {
  calls: MockCall[];
  responses: MockResponse[];
};

const USER_ID = "user-a";
const BOOKMARK_ID = "11111111-1111-4111-8111-111111111111";
const NOTE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_ID = "33333333-3333-4333-8333-333333333333";

export async function runKyoItemToolTests(): Promise<{ passed: number; failed: number }> {
  console.log(section("Kyo Agent Item Tools"));
  clearResults();

  await runTest("upsert schema rejects meaningless creations", async () => {
    const { client } = createMockSupabase();
    const tool = createUpsertKyoItemTool(createContext(client));

    assert(!tool.inputSchema.safeParse({ type: "bookmark" }).success, "Bookmark must require url");
    assert(!tool.inputSchema.safeParse({ type: "note", text: "" }).success, "Note must require text");
    assert(
      tool.inputSchema.safeParse({ type: "bookmark", url: "https://example.com" }).success,
      "Valid bookmark should parse"
    );
  });

  await runTest("upsert tool exposes DeepSeek-compatible object schema", async () => {
    const { client } = createMockSupabase();
    const tool = createUpsertKyoItemTool(createContext(client));
    const schema = z.toJSONSchema(tool.inputSchema);

    assertEq(schema.type, "object");
    assert(
      !("oneOf" in schema) && !("anyOf" in schema),
      "DeepSeek requires function parameters to be a top-level object, not a root union"
    );
  });

  await runTest("search uses search_items rpc for saved items", async () => {
    const { client, calls } = createMockSupabase({
      data: [{ id: BOOKMARK_ID, type: "bookmark", title: "赵纯想独立开发课程" }],
      error: null,
    });
    const trace: ToolTraceEntry[] = [];
    const tool = createSearchKyoItemsTool(createContext(client, trace));

    const result = await tool.execute({ query: "  纯想  ", limit: 7 });

    assertEq(result.query, "纯想");
    assertEq(result.items.length, 1);
    const rpc = calls.find((call) => call.method === "rpc");
    assertEq(rpc?.args?.[0], "search_items");
    assertJsonEq(rpc?.args?.[1], { q: "纯想", lim: 7 });
    assertEq(trace.at(-1)?.status, "success");
  });

  await runTest("desktop sticky tool verifies row and requests client sync", async () => {
    const { client, calls } = createMockSupabase(
      { data: { order_index: 4 }, error: null },
      {
        data: {
          id: NOTE_ID,
          title: "今天吃什么",
          text: "思考今天的晚食计划",
          color: "yellow",
          tags: ["life"],
          on_desktop: true,
          order_index: 5,
        },
        error: null,
      }
    );
    const trace: ToolTraceEntry[] = [];
    const tool = createDesktopStickyTool(createContext(client, trace));
    const schema = z.toJSONSchema(tool.inputSchema);

    assertEq(schema.type, "object");
    const result = await tool.execute({
      title: "今天吃什么",
      text: "思考今天的晚食计划",
      tags: ["life"],
    });

    assertEq(result.verified, true);
    assertEq(result.onDesktop, true);
    assertEq(result.row.onDesktop, true);
    assertEq(result.clientEffect.type, "sync-kyo-items");
    assertJsonEq(result.clientEffect.itemIds, [NOTE_ID]);
    assertEq(trace.at(-1)?.status, "success");

    const payload = firstPayload(calls, "insert");
    assertEq(payload.type, "note");
    assertEq(payload.on_desktop, true);
    assertEq(payload.in_dock, false);
  });

  await runTest("upsert note creates scoped payload with next order index", async () => {
    const { client, calls } = createMockSupabase(
      { data: { order_index: 4 }, error: null },
      { data: { id: NOTE_ID, type: "note" }, error: null }
    );
    const trace: ToolTraceEntry[] = [];
    const tool = createUpsertKyoItemTool(createContext(client, trace));

    const result = await tool.execute({
      type: "note",
      text: "记得整理标签",
      color: "blue",
      tags: ["work", "work", "  "],
      onDesktop: true,
    });

    assertEq(result.action, "created");
    assertEq(result.clientEffect.type, "sync-kyo-items");
    assertJsonEq(result.clientEffect.itemIds, [NOTE_ID]);
    assertEq(trace.at(-1)?.status, "success");
    assert(hasEq(calls, "user_id", USER_ID), "Query must scope by current user");

    const payload = firstPayload(calls, "insert");
    assertEq(payload.user_id, USER_ID);
    assertEq(payload.type, "note");
    assertEq(payload.text, "记得整理标签");
    assertEq(payload.color, "blue");
    assertJsonEq(payload.tags, ["work"]);
    assertEq(payload.on_desktop, true);
    assertEq(payload.order_index, 5);
  });

  await runTest("upsert bookmark updates existing url instead of duplicating", async () => {
    const { client, calls } = createMockSupabase(
      { data: { id: BOOKMARK_ID }, error: null },
      {
        data: {
          id: BOOKMARK_ID,
          type: "bookmark",
          title: "Renamed",
          url: "https://example.com",
          text: null,
          color: null,
          on_desktop: true,
        },
        error: null,
      }
    );
    const tool = createUpsertKyoItemTool(createContext(client));

    const result = await tool.execute({
      type: "bookmark",
      url: "https://example.com",
      title: "Example",
      tags: ["ref", "ref"],
    });

    assertEq(result.action, "updated");
    assertEq(result.clientEffect.type, "sync-kyo-items");
    assertJsonEq(result.clientEffect.itemIds, [BOOKMARK_ID]);
    assert(!calls.some((call) => call.method === "insert"), "Existing bookmark must not insert duplicate");
    assert(hasEq(calls, "id", BOOKMARK_ID), "Update must target exact id");
    assert(hasEq(calls, "user_id", USER_ID), "Update must scope by current user");

    const payload = firstPayload(calls, "update");
    assertEq(payload.title, "Example");
    assertEq(payload.url, "https://example.com");
    assertJsonEq(payload.tags, ["ref"]);
  });

  await runTest("upsert bookmark creates scoped payload when url is new", async () => {
    const { client, calls } = createMockSupabase(
      { data: null, error: null },
      { data: null, error: null },
      { data: { id: BOOKMARK_ID, type: "bookmark" }, error: null }
    );
    const tool = createUpsertKyoItemTool(createContext(client));

    const result = await tool.execute({
      type: "bookmark",
      url: "https://kyo.is",
      title: "Kyo",
      summary: "Agentic workspace",
      tags: ["workspace"],
      inDock: true,
    });

    assertEq(result.action, "created");
    assertEq(result.clientEffect.type, "sync-kyo-items");
    assertJsonEq(result.clientEffect.itemIds, [BOOKMARK_ID]);
    assert(hasEq(calls, "user_id", USER_ID), "Create query must scope by current user");

    const payload = firstPayload(calls, "insert");
    assertEq(payload.user_id, USER_ID);
    assertEq(payload.type, "bookmark");
    assertEq(payload.url, "https://kyo.is");
    assertEq(payload.title, "Kyo");
    assertEq(payload.summary, "Agentic workspace");
    assertJsonEq(payload.tags, ["workspace"]);
    assertEq(payload.in_dock, true);
    assertEq(payload.order_index, 0);
  });

  await runTest("update and delete require exact id plus current user", async () => {
    const { client, calls } = createMockSupabase(
      { data: { id: BOOKMARK_ID }, error: null },
      {
        data: {
          id: BOOKMARK_ID,
          type: "bookmark",
          title: "Renamed",
          text: null,
          url: "https://example.com",
          color: null,
          on_desktop: true,
        },
        error: null,
      }
    );

    const updateTool = createUpdateKyoItemTool(createContext(client));
    const deleteTool = createDeleteKyoItemTool(createContext(client));

    const updateResult = await updateTool.execute({
      id: BOOKMARK_ID,
      title: "Renamed",
      text: "更新后的便签内容",
      color: "green",
      tags: ["later", "later"],
      orderIndex: 3,
    });
    const deleteResult = await deleteTool.execute({ id: BOOKMARK_ID });

    assertEq(updateResult.clientEffect.type, "sync-kyo-items");
    assertJsonEq(updateResult.clientEffect.itemIds, [BOOKMARK_ID]);
    assertEq(deleteResult.clientEffect.type, "sync-kyo-items");
    assertJsonEq(deleteResult.clientEffect.itemIds, [BOOKMARK_ID]);
    assertEq(deleteResult.item.title, "Renamed");
    assertEq(deleteResult.item.onDesktop, true);
    assertEq(deleteResult.clientEffect.deletedItems?.[0]?.id, BOOKMARK_ID);
    assert(hasEq(calls, "id", BOOKMARK_ID), "Mutation must target exact id");
    assert(hasEq(calls, "user_id", USER_ID), "Mutation must scope by current user");
    assert(calls.some((call) => call.method === "delete"), "Delete query must be issued");

    const payload = firstPayload(calls, "update");
    assertEq(payload.title, "Renamed");
    assertEq(payload.text, "更新后的便签内容");
    assertEq(payload.color, "green");
    assertEq(payload.order_index, 3);
    assertJsonEq(payload.tags, ["later"]);
  });

  await runTest("reorder verifies ownership before writing order indexes", async () => {
    const { client, calls } = createMockSupabase(
      { data: [{ id: NOTE_ID }, { id: OTHER_ID }], error: null },
      { data: { id: NOTE_ID }, error: null },
      { data: { id: OTHER_ID }, error: null }
    );
    const tool = createReorderKyoItemsTool(createContext(client));

    const result = await tool.execute({ orderedIds: [NOTE_ID, OTHER_ID] });

    assertEq(result.updated, 2);
    assertEq(result.clientEffect.type, "sync-kyo-items");
    assertJsonEq(result.clientEffect.itemIds, [NOTE_ID, OTHER_ID]);
    assert(calls.some((call) => call.method === "in"), "Ownership query must filter requested ids");
    assert(hasEq(calls, "user_id", USER_ID), "Ownership and updates must scope by current user");

    const updates = calls.filter((call) => call.method === "update").map((call) => call.payload);
    assertEq(updates.length, 2);
    assertEq(updates[0]?.order_index, 0);
    assertEq(updates[1]?.order_index, 1);
  });

  return printSummary();
}

function createContext(client: SupabaseClient, trace: ToolTraceEntry[] = []) {
  return { client, userId: USER_ID, trace };
}

function createMockSupabase(...responses: MockResponse[]) {
  const state: MockState = { calls: [], responses: [...responses] };
  const client = {
    rpc(name: string, args: Record<string, unknown>) {
      state.calls.push({ table: "rpc", method: "rpc", args: [name, args] });
      const response = state.responses.shift();
      if (!response) throw new Error("No mock response left for rpc");
      return Promise.resolve(response);
    },
    from(table: string) {
      state.calls.push({ table, method: "from" });
      return new MockQueryBuilder(state, table);
    },
  } as unknown as SupabaseClient;
  return { client, calls: state.calls };
}

class MockQueryBuilder {
  constructor(private readonly state: MockState, private readonly table: string) {}

  select(value: string) {
    return this.record("select", [value]);
  }

  eq(column: string, value: unknown) {
    return this.record("eq", [column, value]);
  }

  in(column: string, value: unknown[]) {
    return this.record("in", [column, value]);
  }

  order(column: string, options: Record<string, unknown>) {
    return this.record("order", [column, options]);
  }

  limit(value: number) {
    return this.record("limit", [value]);
  }

  insert(payload: Record<string, unknown>) {
    return this.record("insert", undefined, payload);
  }

  update(payload: Record<string, unknown>) {
    return this.record("update", undefined, payload);
  }

  delete() {
    return this.record("delete");
  }

  maybeSingle(): Promise<MockResponse> {
    return this.finish("maybeSingle");
  }

  single(): Promise<MockResponse> {
    return this.finish("single");
  }

  then<TResult1 = MockResponse, TResult2 = never>(
    onfulfilled?: ((value: MockResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.finish("then").then(onfulfilled, onrejected);
  }

  private record(method: string, args?: unknown[], payload?: Record<string, unknown>) {
    this.state.calls.push({ table: this.table, method, args, payload });
    return this;
  }

  private finish(method: string): Promise<MockResponse> {
    this.state.calls.push({ table: this.table, method });
    const response = this.state.responses.shift();
    if (!response) throw new Error(`No mock response left for ${method}`);
    return Promise.resolve(response);
  }
}

function hasEq(calls: MockCall[], column: string, value: unknown): boolean {
  return calls.some((call) => call.method === "eq" && call.args?.[0] === column && call.args?.[1] === value);
}

function firstPayload(calls: MockCall[], method: string): Record<string, unknown> {
  const call = calls.find((item) => item.method === method && item.payload);
  assert(Boolean(call?.payload), `Missing payload for ${method}`);
  return call?.payload ?? {};
}

function assertJsonEq(actual: unknown, expected: unknown): void {
  assertEq(JSON.stringify(actual), JSON.stringify(expected));
}

if (import.meta.main) {
  runKyoItemToolTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}
