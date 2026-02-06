// Re-export toast from sonner
import { toast } from "sonner";

export { toast };

// The useToast hook is kept for compatibility but now just returns the toast function
export function useToast() {
  return { toast };
} 