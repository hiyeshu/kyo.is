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
    <form onSubmit={onSubmit} className="flex gap-2 items-center">
      <input
        type="text"
        value={input}
        onChange={onInputChange}
        placeholder={t("apps.chat.inputPlaceholder", "输入消息...")}
        disabled={isLoading}
        className={`
          flex-1 h-9 px-3 text-xs font-geneva-12
          border border-gray-800
          backdrop-blur-lg bg-white/80
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50
          ${isMacTheme ? "rounded-full" : "rounded"}
        `}
      />
      {isLoading ? (
        <Button
          type="button"
          onClick={onStop}
          variant="destructive"
          className="h-9 px-4"
        >
          {t("apps.chat.stop", "停止")}
        </Button>
      ) : (
        <Button
          type="submit"
          disabled={!input || !input.trim()}
          className="h-9 px-4"
        >
          {t("apps.chat.send", "发送")}
        </Button>
      )}
    </form>
  );
}
