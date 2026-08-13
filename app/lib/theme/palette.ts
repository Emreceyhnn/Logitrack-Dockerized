// Barrel composing the theme palettes. The per-mode colour objects live under
// ./palette/ (dark, light, and their extracted KPI ramps) to keep each file
// focused and under ~400 lines.
import { dark } from "./palette/dark";
import { light } from "./palette/light";

export const palettes = {
  dark,
  light,
};
