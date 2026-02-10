/**
 * [INPUT]: 依赖 react 的 FormEvent 类型，依赖 useThemeStore 获取当前主题
 * [OUTPUT]: 对外提供 ChatInput 组件
 * [POS]: apps/chat/components 的输入框组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import { PaperPlaneRight, Square } from "@phosphor-icons/react";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((state) => state.current);
  const isMacTheme = currentTheme === "macosx";

  return (
    <form onSubmit={onSubmit} className="relative">
      <input
        type="text"
        value={input}
        onChange={onInputChange}
        placeholder={t("apps.chat.inputPlaceholder", "输入消息...")}
        disabled={isLoading}
        className={`
          w-full h-9 text-xs font-geneva-12
          border border-gray-800
          backdrop-blur-lg bg-white/80
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50
          ${isMacTheme ? "pl-3 pr-[52px] rounded-full" : "pl-2 pr-[52px] rounded"}
        `}
      />

      {/* 按钮容器 - 绝对定位在输入框右侧 */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isLoading ? (
          // 停止按钮
          <Button
            type="button"
            onClick={onStop}
            className={`text-xs w-9 h-9 p-0 flex items-center justify-center ${
              isMacTheme ? "rounded-full" : "rounded-none"
            } ${
              isMacTheme
                ? "relative overflow-hidden transition-transform hover:scale-105"
                : "bg-black hover:bg-black/80 text-white border-2 border-gray-800"
            }`}
            style={
              isMacTheme
                ? {
                    background:
                      "linear-gradient(rgba(254, 205, 211, 0.9), rgba(252, 165, 165, 0.9))",
                    boxShadow:
                      "0 2px 3px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.3), inset 0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 2px rgba(0,0,0,0.4), inset 0 2px 3px 1px rgba(254, 205, 211, 0.5)",
                    backdropFilter: "blur(2px)",
                  }
                : {}
            }
          >
            {isMacTheme && (
              <>
                {/* Top shine */}
                <div
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: "2px",
                    height: "30%",
                    width: "calc(100% - 18px)",
                    borderRadius: "8px 8px 4px 4px",
                    background:
                      "linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.25))",
                    filter: "blur(0.2px)",
                    zIndex: 2,
                  }}
                />
                {/* Bottom glow */}
                <div
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                  style={{
                    bottom: "1px",
                    height: "38%",
                    width: "calc(100% - 4px)",
                    borderRadius: "4px 4px 100% 100%",
                    background:
                      "linear-gradient(rgba(255,255,255,0.15), rgba(255,255,255,0.55))",
                    filter: "blur(0.3px)",
                    zIndex: 1,
                  }}
                />
              </>
            )}
            <Square
              className={`h-4 w-4 ${
                isMacTheme ? "text-black/70 relative z-10" : ""
              }`}
              weight="fill"
            />
          </Button>
        ) : input.trim() !== "" ? (
          // 发送按钮
          <Button
            type="submit"
            className={`text-xs w-9 h-9 p-0 flex items-center justify-center ${
              isMacTheme ? "rounded-full" : "rounded-none"
            } ${
              isMacTheme
                ? "relative overflow-hidden transition-transform hover:scale-105"
                : "bg-black hover:bg-black/80 text-white border-2 border-gray-800"
            }`}
            style={
              isMacTheme
                ? {
                    background:
                      "linear-gradient(rgba(217, 249, 157, 0.9), rgba(190, 227, 120, 0.9))",
                    boxShadow:
                      "0 2px 3px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.3), inset 0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 2px rgba(0,0,0,0.4), inset 0 2px 3px 1px rgba(217, 249, 157, 0.5)",
                    backdropFilter: "blur(2px)",
                  }
                : {}
            }
          >
            {isMacTheme && (
              <>
                {/* Top shine */}
                <div
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: "2px",
                    height: "30%",
                    width: "calc(100% - 16px)",
                    borderRadius: "12px 12px 4px 4px",
                    background:
                      "linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.25))",
                    filter: "blur(0.2px)",
                    zIndex: 2,
                  }}
                />
                {/* Bottom glow */}
                <div
                  className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                  style={{
                    bottom: "1px",
                    height: "38%",
                    width: "calc(100% - 4px)",
                    borderRadius: "4px 4px 100% 100%",
                    background:
                      "linear-gradient(rgba(255,255,255,0.15), rgba(255,255,255,0.55))",
                    filter: "blur(0.3px)",
                    zIndex: 1,
                  }}
                />
              </>
            )}
            <PaperPlaneRight
              className={`h-4 w-4 ${
                isMacTheme ? "text-black/70 relative z-10" : ""
              }`}
              weight="fill"
            />
          </Button>
        ) : null}
      </div>
    </form>
  );
}
