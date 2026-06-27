/**
 * [INPUT]: 依赖 react 的 useState
 * [OUTPUT]: useAuth stub hook，返回旧认证弹窗 API 的空实现
 * [POS]: hooks/ 的遗留兼容层，保留旧调用方类型契约，不负责 Supabase Auth
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from "react";

export function useAuth() {
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [isLogoutConfirmDialogOpen, setIsLogoutConfirmDialogOpen] =
    useState(false);

  return {
    // State
    username: null as string | null,
    authToken: null as string | null,
    hasPassword: false,

    // Username management
    promptSetUsername: () => {},
    isUsernameDialogOpen,
    setIsUsernameDialogOpen,
    newUsername: "",
    setNewUsername: () => {},
    newPassword: "",
    setNewPassword: () => {},
    isSettingUsername: false,
    usernameError: null as string | null,
    submitUsernameDialog: async () => {},
    setUsernameError: () => {},

    // Token verification
    promptVerifyToken: () => {},
    isVerifyDialogOpen,
    setVerifyDialogOpen,
    verifyTokenInput: "",
    setVerifyTokenInput: () => {},
    verifyPasswordInput: "",
    setVerifyPasswordInput: () => {},
    verifyUsernameInput: "",
    setVerifyUsernameInput: () => {},
    isVerifyingToken: false,
    verifyError: null as string | null,
    handleVerifyTokenSubmit: async (_password: string, _isLogin?: boolean) => {},

    // Password management
    checkHasPassword: async () => false,
    setPassword: async () => ({ ok: false, error: "Not implemented" }),

    // Logout
    logout: async () => {},
    confirmLogout: () => {},
    isLogoutConfirmDialogOpen,
    setIsLogoutConfirmDialogOpen,
  };
}
