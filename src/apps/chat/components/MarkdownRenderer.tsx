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
    console.log("[IACT] Click:", { directive, payload });
    if (directive === "send") {
      onSend(payload);
    } else if (directive === "add") {
      onAdd(payload);
    }
  };

  // 主题样式 - 更明显的视觉效果
  const getThemeStyles = () => {
    if (isMacTheme) {
      return {
        base: "inline-flex items-center px-2 py-1 mx-0.5 rounded-md cursor-pointer select-none transition-all font-medium",
        background: "bg-blue-500/20 hover:bg-blue-500/30 active:bg-blue-500/40",
        text: "text-blue-700 hover:text-blue-800",
        border: "border-2 border-blue-400/60 hover:border-blue-500/80",
        shadow: "shadow-sm hover:shadow-md",
      };
    }
    // Windows XP / 98 主题
    return {
      base: "inline-flex items-center px-2 py-1 mx-0.5 cursor-pointer select-none font-medium",
      background: "bg-[#ece9d8] hover:bg-[#d8d5c8] active:bg-[#c8c5b8]",
      text: "text-[#000080] hover:text-[#000060]",
      border: "border-2 border-[#0054e3]/50 hover:border-[#0054e3]/80",
      shadow: "shadow-sm",
    };
  };

  const styles = getThemeStyles();

  return (
    <span
      onClick={handleClick}
      className={`${styles.base} ${styles.background} ${styles.text} ${styles.border} ${styles.shadow}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      title={directive === "send" ? "点击发送" : "点击填充到输入框"}
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
  // 调试：检查是否包含 IACT 格式
  const hasIACT = content.includes("(!send)") || content.includes("(!add)");

  // 自定义组件：拦截链接渲染
  const components: Components = {
    a: ({ href, children }) => {
      console.log("[IACT] Link detected:", { href, children });

      // 检查是否为 IACT 协议
      if (href?.startsWith("!")) {
        const directive = href.slice(1) as IACTDirective;
        const payload = extractText(children);

        console.log("[IACT] IACT link found:", { directive, payload });

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
      {hasIACT && <div className="text-xs text-gray-400 mb-1">🔗 IACT detected</div>}
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
