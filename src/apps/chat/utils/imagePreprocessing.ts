/**
 * [INPUT]: 依赖浏览器 Canvas API
 * [OUTPUT]: 对外提供 preprocessImage, validateImageFile, ImageAttachment 类型
 * [POS]: apps/chat/utils 的图片预处理工具，被 ChatApp 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================================
// 类型定义
// ============================================================================

export interface ImageAttachment {
  id: string;
  dataUrl: string; // base64 data URL for preview & sending
  name: string;
  type: string; // mime type
  size: number; // original file size
}

// ============================================================================
// 常量
// ============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

// ============================================================================
// 验证
// ============================================================================

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "not_image";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "too_large";
  }
  return null;
}

// ============================================================================
// 预处理：缩放 + 压缩
// ============================================================================

export async function preprocessImage(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 计算缩放尺寸
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      // PNG 保留透明度，其余转 JPEG 压缩
      const isPng = file.type === "image/png";
      const outputType = isPng ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(outputType, isPng ? undefined : JPEG_QUALITY);

      resolve({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        dataUrl,
        name: file.name,
        type: outputType,
        size: file.size,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
