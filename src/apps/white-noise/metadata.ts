/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: appMetadata, helpItems
 * [POS]: white-noise 应用元数据，被 appRegistry 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const appMetadata = {
  name: "White Noise",
  version: "1.0.0",
  creator: {
    name: "yeshu",
    url: "https://github.com/hiyeshu",
  },
  github: "https://github.com/hiyeshu/kyo.is",
  icon: "/icons/macosx/cdrom.png",
};

export const helpItems = [
  {
    icon: "🎵",
    title: "Ambient Sounds",
    description: "Choose from various ambient sounds to help you focus",
  },
  {
    icon: "🔊",
    title: "Volume Control",
    description: "Adjust the volume to your preference",
  },
];
