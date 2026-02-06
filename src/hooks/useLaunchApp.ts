/**
 * [INPUT]: 依赖 stores/useAppStore 的应用状态和启动方法，依赖 config/appRegistry 的应用 ID 类型
 * [OUTPUT]: 对外提供 useLaunchApp hook，应用启动逻辑（启动应用、多实例管理、窗口恢复、前台切换）
 * [POS]: hooks/ 的应用启动 hook，被 Desktop/Dock/MenuBar 等组件使用，是应用启动的统一入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useAppStore, LaunchOriginRect } from "@/stores/useAppStore";
import { AppId } from "@/config/appRegistry";

// Export the interface
export interface LaunchAppOptions {
  initialPath?: string;
  initialData?: unknown; // Add initialData field
  multiWindow?: boolean; // Add multiWindow flag
  launchOrigin?: LaunchOriginRect; // Position of icon that launched the app
}

export const useLaunchApp = () => {
  // Get the launch method and instances from the store
  const launchAppInstance = useAppStore((state) => state.launchApp);
  const instances = useAppStore((state) => state.instances);
  const bringInstanceToForeground = useAppStore(
    (state) => state.bringInstanceToForeground
  );
  const restoreInstance = useAppStore((state) => state.restoreInstance);

  const launchApp = (appId: AppId, options?: LaunchAppOptions) => {
    console.log(`[useLaunchApp] Launch event received for ${appId}`, options);

    // Convert initialPath to proper initialData (legacy support)
    let initialData = options?.initialData;

    // Kyo only has bookmarks app, no special handling needed
    // All apps use single-window mode by default
    const multiWindow = options?.multiWindow || false;

    // Check if all instances of this app are minimized
    // If so, restore them instead of creating a new instance
    const appInstances = Object.values(instances).filter(
      (inst) => inst.appId === appId && inst.isOpen
    );
    
    if (appInstances.length > 0) {
      // Check if all instances are minimized
      const allMinimized = appInstances.every((inst) => inst.isMinimized);
      
      if (allMinimized) {
        // Restore all minimized instances
        let lastRestoredId: string | null = null;
        appInstances.forEach((inst) => {
          if (inst.isMinimized) {
            restoreInstance(inst.instanceId);
            lastRestoredId = inst.instanceId;
          }
        });
        
        // Bring the most recently restored instance to foreground
        if (lastRestoredId) {
          console.log(
            `[useLaunchApp] All instances of ${appId} were minimized, restored and bringing ${lastRestoredId} to foreground`
          );
          bringInstanceToForeground(lastRestoredId);
          return lastRestoredId;
        }
      }
    }

    // Use the new instance-based launch system
    const instanceId = launchAppInstance(
      appId,
      initialData,
      undefined,
      multiWindow,
      options?.launchOrigin
    );
    console.log(
      `[useLaunchApp] Created instance ${instanceId} for app ${appId} with multiWindow: ${multiWindow}`
    );

    return instanceId;
  };

  return launchApp;
};
