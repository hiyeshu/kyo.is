import * as React from "react";
import { useThemeStore } from "@/stores/useThemeStore";

import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
  unstyled?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      unstyled = false,
      type,
      style,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const currentTheme = useThemeStore((state) => state.current);
    const isMacOSTheme = currentTheme === "macosx";
    const isSystem7Theme = currentTheme === "system7";

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        style={{
          ...(isMacOSTheme &&
            !unstyled && {
              border: "1px solid rgba(0, 0, 0, 0.2)",

              fontSize: "12px",
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
              WebkitFontSmoothing: "antialiased",
              backgroundColor: "rgba(255, 255, 255, 1)",
              boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.1)",
              transition: "all 0.2s ease",
              // Padding intentionally omitted so consumer classes (e.g. pl-4 pr-16) take effect
            }),
          ...(isSystem7Theme &&
            !unstyled && {
              borderColor: "#000000",
              borderWidth: "1px",
              borderRadius: "0",
            }),
          ...style,
        }}
        onMouseEnter={(e) => {
          if (isMacOSTheme && !unstyled && e.currentTarget) {
            e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.08)";
          }
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          if (
            isMacOSTheme &&
            !unstyled &&
            e.currentTarget &&
            !e.currentTarget.matches(":focus")
          ) {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
            e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.2)";
            e.currentTarget.style.boxShadow =
              "inset 0 1px 2px rgba(0, 0, 0, 0.1)";
          }
          onMouseLeave?.(e);
        }}
        onFocus={(e) => {
          if (isMacOSTheme && !unstyled && e.currentTarget) {
            e.currentTarget.style.backgroundColor = "#ffffff";
            e.currentTarget.style.borderColor = "rgba(52, 106, 227, 0.6)";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(52, 106, 227, 0.25)";
          }
          onFocus?.(e);
        }}
        onBlur={(e) => {
          if (isMacOSTheme && !unstyled && e.currentTarget) {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
            e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.2)";
            e.currentTarget.style.boxShadow =
              "inset 0 1px 2px rgba(0, 0, 0, 0.1)";
          }
          onBlur?.(e);
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
