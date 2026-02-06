/**
 * [STUB] 空壳 store —— 旧 Finder 文件系统已移除，这里保留接口让布局文件编译通过
 */

import { create } from "zustand";

export interface FileSystemItem {
  name: string;
  path: string;
  isDirectory: boolean;
  icon?: string;
  status?: "active" | "trashed";
  aliasType?: "app" | "file" | "directory";
  aliasTarget?: string;
  uuid?: string;
  appId?: string;
}

interface FilesStore {
  items: Record<string, FileSystemItem>;
  getItem: (path: string) => FileSystemItem | undefined;
  getItemsInPath: (path: string) => FileSystemItem[];
  removeItem: (path: string) => void;
  emptyTrash: () => string[];
}

export const useFilesStore = create<FilesStore>()(() => ({
  items: {},
  getItem: () => undefined,
  getItemsInPath: () => [],
  removeItem: () => {},
  emptyTrash: () => [],
}));
