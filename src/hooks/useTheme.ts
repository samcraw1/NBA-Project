import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // storage can be blocked; fall through to the OS preference
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}
