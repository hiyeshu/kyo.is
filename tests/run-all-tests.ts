#!/usr/bin/env bun
/**
 * [INPUT]: 依赖 ./test-kyo-item-tools、./test-deepseek-classification、./test-worker-api 与 ./test-utils 的 BASE_URL
 * [OUTPUT]: 默认运行 Mastra 工具契约、DeepSeek 分类契约与 Cloudflare Worker API 测试套件，失败时 exit 1
 * [POS]: tests/ 的统一入口，被 package.json test / test:api 调用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { runKyoItemToolTests } from "./test-kyo-item-tools";
import { runChatStreamContractTests } from "./test-chat-stream-contract";
import { runDeepSeekClassificationTests } from "./test-deepseek-classification";
import { runWorkerApiTests } from "./test-worker-api";
import { BASE_URL } from "./test-utils";

type TestSuiteResult = {
  name: string;
  passed: number;
  failed: number;
};

const suites = [
  { name: "kyo-item-tools", run: runKyoItemToolTests },
  { name: "deepseek-classification", run: runDeepSeekClassificationTests },
  { name: "chat-stream-contract", run: runChatStreamContractTests },
  { name: "worker-api", run: runWorkerApiTests },
];

async function main(): Promise<void> {
  const selected = process.argv[2];
  const activeSuites = selected ? suites.filter((suite) => suite.name.includes(selected)) : suites;

  if (selected && activeSuites.length === 0) {
    console.error(`No test suite found matching "${selected}".`);
    console.error(`Available suites: ${suites.map((suite) => suite.name).join(", ")}`);
    process.exit(1);
  }

  console.log("API ENDPOINT TESTS");
  console.log(`Server: ${BASE_URL}\n`);

  const results: TestSuiteResult[] = [];
  for (const suite of activeSuites) {
    try {
      results.push({ name: suite.name, ...(await suite.run()) });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error running ${suite.name}: ${message}`);
      results.push({ name: suite.name, passed: 0, failed: 1 });
    }
  }

  const passed = results.reduce((sum, result) => sum + result.passed, 0);
  const failed = results.reduce((sum, result) => sum + result.failed, 0);

  console.log("\nSUMMARY");
  for (const result of results) {
    const status = result.failed === 0 ? "ok" : "FAILED";
    console.log(`${result.name}: ${result.passed} passed, ${result.failed} failed - ${status}`);
  }
  console.log(`Total: ${passed} passed, ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
