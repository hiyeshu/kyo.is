/**
 * IACT 协议测试组件
 * 用于验证 Markdown 渲染和 IACT 链接是否正常工作
 */

import { useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";

export function IACTTest() {
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const handleSend = (text: string) => {
    addLog(`[SEND] ${text}`);
  };

  const handleAdd = (text: string) => {
    addLog(`[ADD] ${text}`);
  };

  const testCases = [
    {
      name: "基础 IACT !send",
      content: "我可以帮你 [深入分析](!send) 或者 [生成报告](!send)",
    },
    {
      name: "基础 IACT !add",
      content: "你可以 [告诉我更多细节](!add) 来补充信息",
    },
    {
      name: "混合使用",
      content: "接下来可以 [继续这个话题](!send)，或者 [让我先了解你的需求](!add)",
    },
    {
      name: "普通 Markdown",
      content: "这是**粗体**和*斜体*，还有 [普通链接](https://example.com)",
    },
    {
      name: "代码块",
      content: "这是代码：`const x = 1;`\n\n```js\nfunction test() {\n  return 42;\n}\n```",
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">IACT 协议测试</h1>

      {testCases.map((test, idx) => (
        <div key={idx} className="border border-gray-300 rounded p-3">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            {test.name}
          </h3>
          <div className="bg-blue-100 p-2 rounded">
            <MarkdownRenderer
              content={test.content}
              onSend={handleSend}
              onAdd={handleAdd}
            />
          </div>
          <details className="mt-2">
            <summary className="text-xs text-gray-500 cursor-pointer">
              查看原始内容
            </summary>
            <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
              {test.content}
            </pre>
          </details>
        </div>
      ))}

      <div className="border border-gray-300 rounded p-3">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">事件日志</h3>
        <div className="bg-gray-50 p-2 rounded max-h-40 overflow-y-auto">
          {log.length === 0 ? (
            <p className="text-xs text-gray-400">点击 IACT 链接查看日志</p>
          ) : (
            log.map((entry, idx) => (
              <div key={idx} className="text-xs font-mono">
                {entry}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
