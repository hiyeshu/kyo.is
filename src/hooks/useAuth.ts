/**
 * [STUB] Auth hook — 聊天系统移除后简化为无操作空壳
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
