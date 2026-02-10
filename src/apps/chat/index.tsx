/**
 * [INPUT]: 依赖 ./components/ChatApp 的聊天组件，依赖 ../base/types 的 BaseApp 类型
 * [OUTPUT]: 对外提供 ChatApp 应用配置对象
 * [POS]: apps/chat 的入口文件，被 AppManager 加载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { BaseApp } from "../base/types";
import { ChatAppComponent } from "./components/ChatApp";

export const ChatApp: BaseApp = {
  id: "chat",
  name: "Chat",
  icon: { type: "image", src: "/icons/default/application.png" },
  description: "与 AI 助手聊天",
  component: ChatAppComponent,
};
