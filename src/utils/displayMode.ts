export type DisplayMode =
  | "color"
  | "monotone"
  | "crt"
  | "sepia"
  | "high-contrast"
  | "dream"
  | "invert";

export const applyDisplayMode = (mode: DisplayMode) => {
  const root = document.documentElement;
  root.style.filter = "none";
  root.classList.remove("crt-effect");

  switch (mode) {
    case "monotone":
      root.style.filter = "grayscale(100%)";
      root.classList.add("crt-effect");
      break;
    case "crt":
      root.style.filter = "brightness(1.05) contrast(1.05) saturate(1.05)";
      root.classList.add("crt-effect");
      break;
    case "sepia":
      root.style.filter = "sepia(0.8)";
      break;
    case "high-contrast":
      root.style.filter = "contrast(1.5) brightness(1.1)";
      break;
    case "dream":
      root.style.filter =
        "brightness(1.1) contrast(0.9) saturate(1.5) blur(1px)";
      break;
    case "invert":
      root.style.filter = "invert(1)";
      break;
    default:
      root.style.filter = "none";
  }
};
