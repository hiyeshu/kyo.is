/**
 * [INPUT]: 依赖 react, @/components/ui/input, @/components/ui/button, useThemeStore, AudioBars, ImageAttachment
 * [OUTPUT]: 对外提供 ChatInput 组件
 * [POS]: apps/chat/components 的输入框组件，支持图片附件预览+语音录制波形
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { FormEvent, useRef, ClipboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/stores/useThemeStore";
import {
  ArrowUp,
  Square,
  ImageSquare,
  Microphone,
  X,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { AudioBars } from "@/components/ui/audio-bars";
import type { ImageAttachment } from "../utils/imagePreprocessing";

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
  // 图片附件
  pendingImages: ImageAttachment[];
  onAddImages: (files: FileList) => void;
  onRemoveImage: (id: string) => void;
  // 语音录制
  isRecording: boolean;
  frequencies: number[];
  isSilent: boolean;
  onMicClick: () => void;
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onStop,
  pendingImages,
  onAddImages,
  onRemoveImage,
  isRecording,
  frequencies,
  isSilent,
  onMicClick,
}: ChatInputProps) {
  const { t } = useTranslation();
  const currentTheme = useThemeStore((state) => state.current);
  const isMacTheme = currentTheme === "macosx";
  const isWinTheme = currentTheme === "xp" || currentTheme === "win98";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasContent = input.trim() !== "" || pendingImages.length > 0;

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      imageFiles.forEach((f) => dt.items.add(f));
      onAddImages(dt.files);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1">
      {/* 图片预览条 */}
      <AnimatePresence>
        {pendingImages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex gap-1.5 overflow-x-auto px-1 py-1"
          >
            {pendingImages.map((img) => (
              <div key={img.id} className="relative flex-shrink-0 group">
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="h-16 w-16 object-cover rounded border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(img.id)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={t("apps.chat.removeImage", "移除图片")}
                >
                  <X className="h-2.5 w-2.5" weight="bold" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 输入行 */}
      <div className="flex items-center gap-2">
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              onAddImages(e.target.files);
              e.target.value = "";
            }
          }}
        />

        {/* 输入框容器 */}
        <div className="flex-1 relative flex items-center">
          {isRecording ? (
            /* 录音时：波形可视化替换输入框 */
            <div
              className={`w-full flex items-center justify-center ${
                isMacTheme
                  ? "h-9 rounded-full border border-gray-300 bg-white/80"
                  : isWinTheme
                  ? "!h-9 !min-h-[36px] border border-gray-400 bg-white"
                  : "h-8 border border-gray-300 bg-white"
              }`}
            >
              <AudioBars
                frequencies={frequencies}
                color="black"
                isSilent={isSilent}
                className="h-5"
              />
            </div>
          ) : (
            <>
              <Input
                type="text"
                value={input}
                onChange={onInputChange}
                onPaste={handlePaste}
                placeholder={t("apps.chat.inputPlaceholder", "输入消息...")}
                disabled={isLoading}
                className={`w-full font-geneva-12 ${
                  isMacTheme
                    ? "text-xs pl-3 pr-16 rounded-full h-9"
                    : isWinTheme
                    ? "text-[13px] pl-3 pr-20 !h-9 !min-h-[36px]"
                    : "text-xs pl-2 pr-16"
                }`}
              />

              {/* 功能按钮 - 绝对定位在输入框右侧 */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors w-6 h-6"
                  aria-label={t("apps.chat.attachImage", "添加图片")}
                >
                  <ImageSquare className={isWinTheme ? "h-3.5 w-3.5" : "h-4 w-4"} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={onMicClick}
                  className="flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors w-6 h-6"
                  aria-label={t("apps.chat.recording", "录音")}
                >
                  <Microphone className={isWinTheme ? "h-3.5 w-3.5" : "h-4 w-4"} weight="bold" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* 发送/停止按钮 */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={isLoading ? "stop" : isRecording ? "rec" : "send"}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center"
          >
            {isRecording ? (
              <Button
                type="button"
                onClick={onMicClick}
                className={`p-0 flex items-center justify-center ${
                  isMacTheme
                    ? "text-xs w-9 h-9 rounded-full relative overflow-hidden transition-transform hover:scale-105"
                    : "w-9 h-9"
                }`}
                style={
                  isMacTheme
                    ? {
                        background: "linear-gradient(rgba(254, 205, 211, 0.9), rgba(252, 165, 165, 0.9))",
                        boxShadow: "0 2px 3px rgba(0,0,0,0.2), 0 1px 1px rgba(0,0,0,0.3), inset 0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 2px rgba(0,0,0,0.4), inset 0 2px 3px 1px rgba(254, 205, 211, 0.5)",
                        backdropFilter: "blur(2px)",
                      }
                    : undefined
                }
              >
                {isMacTheme && <AquaShine />}
                <Square
                  className={`h-4 w-4 ${isMacTheme ? "text-black/70 relative z-10" : isWinTheme ? "text-black" : ""}`}
                  weight="fill"
                />
              </Button>
            ) : (
              <Button
                type={isLoading ? "button" : "submit"}
                onClick={isLoading ? onStop : undefined}
                disabled={!isLoading && !hasContent}
                className={`p-0 flex items-center justify-center ${
                  isMacTheme
                    ? "text-xs w-9 h-9 rounded-full relative overflow-hidden transition-transform hover:scale-105"
                    : "w-9 h-9"
                } ${!isLoading && !hasContent ? "opacity-50 cursor-not-allowed" : ""}`}
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
                    className={`h-4 w-4 ${isMacTheme ? "text-black/70 relative z-10" : isWinTheme ? "text-black" : ""}`}
                    weight="fill"
                  />
                ) : (
                  <ArrowUp
                    className={`h-4 w-4 ${isMacTheme ? "text-black/70 relative z-10" : isWinTheme ? "text-black" : ""}`}
                    weight="bold"
                  />
                )}
              </Button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </form>
  );
}
