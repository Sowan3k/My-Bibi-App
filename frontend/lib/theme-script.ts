/**
 * Theme bootstrap — server-safe module (no "use client").
 *
 * Holds the localStorage keys and the inline script that applies the stored
 * theme before first paint. Imported by the server root layout (the script)
 * and by the client ThemeProvider (the keys).
 */

export const MODE_KEY = "bibi_theme_mode";
export const ACCENT_KEY = "bibi_accent";
export const TEXTSIZE_KEY = "bibi_text_size";

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var mode = localStorage.getItem("${MODE_KEY}") || "system";
    var accent = localStorage.getItem("${ACCENT_KEY}") || "rose";
    var size = localStorage.getItem("${TEXTSIZE_KEY}") || "md";
    var dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    if (dark) root.classList.add("dark");
    root.setAttribute("data-accent", accent);
    root.setAttribute("data-textsize", size);
  } catch (e) {}
})();
`;
