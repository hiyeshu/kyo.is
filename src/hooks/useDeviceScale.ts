/**
 * [INPUT]: 依赖 window.innerWidth
 * [OUTPUT]: 自动设置 --device-scale CSS 变量
 * [POS]: hooks/ 的设备缩放检测，根据屏幕宽度设置设备层缩放比例
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect } from "react";

// 设备断点
const BREAKPOINTS = {
  phone: 768,   // < 768px = phone
  tablet: 1024, // 768-1024px = tablet
  desktop: Infinity, // > 1024px = desktop
};

// 设备缩放比例
const DEVICE_SCALES = {
  phone: 1.25,   // iPhone: 放大 25%
  tablet: 1.1,   // iPad: 放大 10%
  desktop: 1.0,  // Desktop: 基准
};

/**
 * 根据设备自动设置 --device-scale CSS 变量
 * 
 * 三层缩放系统中的设备层：
 * - iPhone (<768px): 1.25x - 更大的触摸目标
 * - iPad (768-1024px): 1.1x - 介于手机和桌面之间
 * - Desktop (>1024px): 1.0x - 基准尺寸
 */
export function useDeviceScale() {
  useEffect(() => {
    const setDeviceScale = () => {
      const width = window.innerWidth;
      
      let scale: number;
      if (width < BREAKPOINTS.phone) {
        scale = DEVICE_SCALES.phone;
      } else if (width < BREAKPOINTS.tablet) {
        scale = DEVICE_SCALES.tablet;
      } else {
        scale = DEVICE_SCALES.desktop;
      }
      
      document.documentElement.style.setProperty("--device-scale", String(scale));
    };
    
    // 初始设置
    setDeviceScale();
    
    // 监听窗口大小变化
    window.addEventListener("resize", setDeviceScale);
    
    return () => {
      window.removeEventListener("resize", setDeviceScale);
    };
  }, []);
}

/**
 * 获取当前设备类型
 */
export function getDeviceType(): "phone" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  
  const width = window.innerWidth;
  if (width < BREAKPOINTS.phone) return "phone";
  if (width < BREAKPOINTS.tablet) return "tablet";
  return "desktop";
}

/**
 * 设置用户自定义缩放（系统偏好设定使用）
 */
export function setUserScale(scale: number) {
  document.documentElement.style.setProperty("--user-scale", String(scale));
}

/**
 * 获取用户自定义缩放值
 */
export function getUserScale(): number {
  if (typeof window === "undefined") return 1;
  
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--user-scale")
    .trim();
  
  return value ? parseFloat(value) : 1;
}
