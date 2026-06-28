#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 mastra/tools/kyoItemsTool 与 ./test-utils
 * [OUTPUT]: runKyoItemsToolTests，验证 saved item 搜索与 id 更新契约
 * [POS]: tests/ 的 Mastra 工具回归套件，锁住 kyo_items 与 workspace_files 的边界
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createSearchKyoItemsTool, createUpsertKyoItemTool } from "../src/mastra/tools/kyoItemsTool";
import type { ToolTraceEntry } from "../src/server/types";
import { assert, assertEq, clearResults, printSummary, runTest, section } from "./test-utils";

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

interface DbCall {
  op: string;
  table?: string;
  payload?: Record<string, unknown>;
  column?: string;
  value?: unknown;
  columns?: string;
}

const ITEM_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

export async function runKyoItemsToolTests(): Promise<{ passed: number; failed: number }> {
  console.log(section("Kyo Items Tool"));
  clearResults();

  await runTest("saved item search uses search_items rpc", async () => {
    const client = createRpcClient([{ id: ITEM_ID, type: "bookmark", title: "赵纯想独立开发课程" }]);
    const trace: ToolTraceEntry[] = [];
    const tool = createSearchKyoItemsTool({ client: client as never, userId: USER_ID, trace });

    const output = await tool.execute({ query: "纯想", limit: 7 });

    assertEq(client.rpcCalls.length, 1);
    assertEq(client.rpcCalls[0]?.name, "search_items");
    assertEq(client.rpcCalls[0]?.args.q, "纯想");
    assertEq(client.rpcCalls[0]?.args.lim, 7);
    assertEq(output.items.length, 1);
    assertEq(output.query, "纯想");
    assert(trace.some((entry) => entry.tool === "search-kyo-items" && entry.status === "success"), "Expected success trace");
  });

  await runTest("id update only writes provided fields", async () => {
    const client = createUpdateClient();
    const tool = createUpsertKyoItemTool({ client: client as never, userId: USER_ID, trace: [] });

    const output = await tool.execute({ id: ITEM_ID, type: "bookmark", onDesktop: true });
    const update = client.calls.find((call) => call.op === "update");

    assertEq(output.action, "updated");
    assertEq(output.id, ITEM_ID);
    assert(update?.payload !== undefined, "Expected update payload");
    assertEq(update?.payload?.on_desktop, true);
    assert(typeof update?.payload?.updated_at === "string", "Expected updated_at touch");
    assert(!("title" in update!.payload!), "Should not clear missing title");
    assert(!("summary" in update!.payload!), "Should not clear missing summary");
    assert(!("tags" in update!.payload!), "Should not clear missing tags");
    assert(client.calls.some((call) => call.op === "eq" && call.column === "user_id" && call.value === USER_ID), "Expected user scope");
  });

  return printSummary();
}

function createRpcClient(data: Array<Record<string, unknown>>) {
  return {
    rpcCalls: [] as RpcCall[],
    async rpc(name: string, args: Record<string, unknown>) {
      this.rpcCalls.push({ name, args });
      return { data, error: null };
    },
  };
}

function createUpdateClient() {
  const calls: DbCall[] = [];
  const chain = {
    update(payload: Record<string, unknown>) {
      calls.push({ op: "update", payload });
      return chain;
    },
    eq(column: string, value: unknown) {
      calls.push({ op: "eq", column, value });
      return chain;
    },
    select(columns: string) {
      calls.push({ op: "select", columns });
      return chain;
    },
    async single() {
      calls.push({ op: "single" });
      return { data: { id: ITEM_ID, type: "bookmark" }, error: null };
    },
  };

  return {
    calls,
    from(table: string) {
      calls.push({ op: "from", table });
      return chain;
    },
  };
}

if (import.meta.main) {
  runKyoItemsToolTests().then(({ failed }) => process.exit(failed > 0 ? 1 : 0));
}
