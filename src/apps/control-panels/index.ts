/**
 * [INPUT]: 依赖 components/ControlPanelsApp, metadata
 * [OUTPUT]: 对外提供 ControlPanelsApp 组件和 appMetadata
 * [POS]: apps/control-panels/ 的入口文件，被 appRegistry 导入
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export { ControlPanelsApp } from "./components/ControlPanelsApp";
export { appMetadata, helpItems } from "./metadata";
