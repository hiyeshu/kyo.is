/**
 * [INPUT]: 依赖 react, @/components/ui/input, @/components/ui/button, useThemeStore
 * [OUTPUT]: 对外提供 ChatInput 组件
 * [POS]: apps/chat/components 的输入框组件，使用系统 Input 组件保持主题一致
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import {
  ArrowUp,
  Square,
  Paperclip,
  ImageSquare,
  Microphone,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// Aqua 高光效果（仅 macOS）
// ============================================================================

function AquaShine() {
  return (
    <>
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
  );
}

// ============================================================================
// 主组件
// ============================================================================

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
  const isEmpty = input.trim() === "";

  return (
    <form onSubmit={onSubmit} className="flex gap-1">
      {/* 输入框容器 */}
      <div className="flex-1 relative">
        <Input
          type="text"
          value={input}
          onChange={onInputChange}
          placeholder={t("apps.chat.inputPlaceholder", "输入消息...")}
          disabled={isLoading}
          className={`w-full text-xs font-geneva-12 ${
            isMacTheme ? "pl-3 pr-20 rounded-full" : "pl-2 pr-20"
          }`}
        />

        {/* 功能按钮 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {[Paperclip, ImageSquare, Microphone].map((Icon, i) => (
            <button
              key={i}
              type="button"
              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Icon className="h-4 w-4" weight="bold" />
            </button>
          ))}
        </div>
      </div>

      {/* 发送/停止按钮 */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={isLoading ? "stop" : "send"}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Button
            type={isLoading ? "button" : "submit"}
            onClick={isLoading ? onStop : undefined}
            disabled={!isLoading && isEmpty}
            className={`text-xs w-9 h-9 p-0 flex items-center justify-center ${
              isMacTheme
                ? "rounded-full relative overflow-hidden transition-transform hover:scale-105"
                : ""
            } ${!isLoading && isEmpty ? "opacity-50 cursor-not-allowed" : ""}`}
            style={
              isMacTheme
                ? {
                    background: isLoading
                      ? "linear-gradient(rgba(254, 205, 211, 0.9), rgba(252, 165, 165, 0.9))"
                      : "linear-gradient(rgba(217, 249, 157, 0.9), rgba(190, 227, 120, 0.9))",
                    boxShadow: isLoading
                      ? "0 2px 3px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.3), inset 0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 2px rgba(0,0,0,0.4), inset 0 2px 3px 1px rgba(254, 205, 211, 0.5)"
                      : "0 2px 3px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.3), inset 0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 2px rgba(0,0,0,0.4), inset 0 2px 3px 1px rgba(217, 249, 157, 0.5)",
                    backdropFilter: "blur(2px)",
                  }
                : undefined
            }
          >
            {isMacTheme && <AquaShine />}
            {isLoading ? (
              <Square
                className={`h-4 w-4 ${isMacTheme ? "text-black/70 relative z-10" : ""}`}
                weight="fill"
              />
            ) : (
              <ArrowUp
                className={`h-4 w-4 ${isMacTheme ? "text-black/70 relative z-10" : ""}`}
                weight="bold"
              />
            )}
          </Button>
        </motion.div>
      </AnimatePresence>
    </form>
  );
}
