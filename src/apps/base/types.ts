/**
 * [INPUT]: react
 * [OUTPUT]: AppProps, BaseApp, AppState, AppManagerState, AnyApp, AnyInitialData
 * [POS]: 所有应用共享的类型契约，是 app 框架的类型基石
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface AppProps<TInitialData = unknown> {
  isWindowOpen: boolean;
  onClose: () => void;
  isForeground?: boolean;
  className?: string;
  skipInitialSound?: boolean;
  initialData?: TInitialData;
  helpItems?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  instanceId: string;
  title?: string;
  onNavigateNext?: () => void;
  onNavigatePrevious?: () => void;
  menuBar?: React.ReactNode;
}

export interface BaseApp<TInitialData = unknown> {
  id: string;
  name: string;
  icon: string | { type: "image"; src: string };
  description: string;
  component: React.ComponentType<AppProps<TInitialData>>;
  windowConstraints?: {
    minWidth?: number | string;
    minHeight?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
  };
  helpItems?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  metadata?: {
    name: string;
    version: string;
    creator: {
      name: string;
      url: string;
    };
    github: string;
    icon: string;
  };
}

export interface AppState<TInitialData = unknown> {
  isOpen: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  isForeground?: boolean;
  initialData?: TInitialData;
}

export interface AppManagerState {
  windowOrder: string[];
  apps: {
    [appId: string]: AppState;
  };
}

// 简化: 所有应用统一为 BaseApp<unknown>
export type AnyApp = BaseApp<unknown>;
export type AnyInitialData = unknown;

// Theme-aware menu bar pattern:
// For XP/98 themes, pass the menu bar as a prop to WindowFrame
// For other themes, render the menu bar normally outside WindowFrame
