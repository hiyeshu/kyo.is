# Themes

Three themes. Three eras.

## macOS Aqua

2001. Steve Jobs said: "We made buttons you want to lick."

Translucent, rounded, jelly buttons. This is the default theme.

## Windows XP

2001. Blue sky, white clouds, green hills. A billion desktops shared this memory.

Luna blue, rounded windows, that classic Start button.

## Windows 98

1998. Gray, square, pixel fonts.

No rounded corners. No shadows. No nonsense. The most honest era of UI.

## Implementation

All colors are CSS variables. Nothing is hardcoded.

```css
var(--window-bg)
var(--window-border)
var(--titlebar-bg)
```

Switching themes means switching a set of variables. Components don't need to know which theme is active.

The wallpaper system is independent of themes. You can pair Aqua windows with XP's rolling hills. Your rules.
