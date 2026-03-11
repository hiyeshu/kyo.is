/**
 * [INPUT]: 依赖 react-markdown, remark-gfm, @/stores/useThemeStore
 * [OUTPUT]: 对外提供 MarkdownRenderer 组件
 * [POS]: apps/chat/components 的 Markdown 渲染器，支持 IACT 协议
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useThemeStore } from "@/stores/useThemeStore";
import type { Components } from "react-markdown";
import "./markdown.css";

// ============================================================================
// IACT 协议类型定义
// ============================================================================

export type IACTDirective = "send" | "add";

export interface IACTLinkProps {
  directive: IACTDirective;
  payload: string;
  onSend: (text: string) => void;
  onAdd: (text: string) => void;
}

// ============================================================================
// IACT 链接组件
// ============================================================================

function IACTLink({ directive, payload, onSend, onAdd }: IACTLinkProps) {
  const currentTheme = useThemeStore((s) => s.current);
  const isMacTheme = currentTheme === "macosx";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (directive === "send") {
      onSend(payload);
    } else if (directive === "add") {
      onAdd(payload);
    }
  };

  // 主题样式
  const getThemeStyles = () => {
    if (isMacTheme) {
      return {
        base: "inline-flex items-center px-1.5 py-0.5 rounded cursor-pointer select-none transition-all",
        background: "bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30",
        text: "text-blue-600 hover:text-blue-700",
        border: "border border-blue-300/50",
      };
    }
    // Windows XP / 98 主题
    return {
      base: "inline-flex items-center px-1.5 py-0.5 cursor-pointer select-none",
      background: "bg-[#ece9d8] hover:bg-[#d8d5c8] active:bg-[#c8c5b8]",
      text: "text-[#000080] hover:text-[#000060]",
      border: "border border-[#0054e3]/30",
    };
  };

  const styles = getThemeStyles();

  return (
    <span
      onClick={handleClick}
      className={`${styles.base} ${styles.background} ${styles.text} ${styles.border}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
    >
      {payload}
    </span>
  );
}

// ============================================================================
// Markdown 渲染器组件
// ============================================================================

export interface MarkdownRendererProps {
  content: string;
  onSend: (text: string) => void;
  onAdd: (text: string) => void;
}

export function MarkdownRenderer({
  content,
  onSend,
  onAdd,
}: MarkdownRendererProps) {
  // 自定义组件：拦截链接渲染
  const components: Components = {
    a: ({ href, children }) => {
      // 检查是否为 IACT 协议
      if (href?.startsWith("!")) {
        const directive = href.slice(1) as IACTDirective;
        const payload = extractText(children);

        // 只支持 !send 和 !add
        if (directive === "send" || directive === "add") {
          return (
            <IACTLink
              directive={directive}
              payload={payload}
              onSend={onSend}
              onAdd={onAdd}
            />
          );
        }
      }

      // 普通链接：在新标签页打开
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 underline"
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className="markdown-content prose prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 从 React 子节点中提取纯文本
 */
function extractText(children: React.ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractText).join("");
  }
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}
