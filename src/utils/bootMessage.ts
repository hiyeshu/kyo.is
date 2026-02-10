export const BOOT_MESSAGE_KEY = "kyo:nextBootMessage";
export const BOOT_DEBUG_KEY = "kyo:bootDebugMode";

interface BootMessageData {
  key: string;
  params?: Record<string, string>;
}

/**
 * 存储下次启动画面的翻译 key + 参数
 * 延迟到 BootScreen 显示时再翻译，避免 i18n 未加载问题
 */
export const setNextBootMessage = (keyOrMessage: string, paramsOrDebug?: Record<string, string> | boolean, debugMode = false): void => {
  try {
    // 兼容：如果第二个参数是 boolean，视为 debugMode（旧 API）
    if (typeof paramsOrDebug === "boolean") {
      debugMode = paramsOrDebug;
      sessionStorage.setItem(BOOT_MESSAGE_KEY, JSON.stringify({ key: keyOrMessage }));
    } else {
      sessionStorage.setItem(BOOT_MESSAGE_KEY, JSON.stringify({ key: keyOrMessage, params: paramsOrDebug }));
    }
    if (debugMode) {
      sessionStorage.setItem(BOOT_DEBUG_KEY, "true");
    } else {
      sessionStorage.removeItem(BOOT_DEBUG_KEY);
    }
  } catch (error) {
    console.error("Error setting boot message in sessionStorage:", error);
  }
};

/**
 * 读取启动消息数据（key + params），由 BootScreen 翻译后显示
 */
export const getNextBootMessage = (): BootMessageData | null => {
  try {
    const raw = sessionStorage.getItem(BOOT_MESSAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BootMessageData;
    } catch {
      // 兼容旧格式（纯文本）
      return { key: raw };
    }
  } catch (error) {
    console.error("Error getting boot message from sessionStorage:", error);
    return null;
  }
};

export const isBootDebugMode = (): boolean => {
  try {
    return sessionStorage.getItem(BOOT_DEBUG_KEY) === "true";
  } catch (error) {
    console.error("Error getting boot debug mode from sessionStorage:", error);
    return false;
  }
};

export const clearNextBootMessage = (): void => {
  try {
    sessionStorage.removeItem(BOOT_MESSAGE_KEY);
    sessionStorage.removeItem(BOOT_DEBUG_KEY);
  } catch (error) {
    console.error("Error clearing boot message from sessionStorage:", error);
  }
};
