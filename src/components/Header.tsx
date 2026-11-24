import type { Theme } from "../hooks/useTheme";

const NAV = [
  { href: "#/", label: "Scores", active: (r: string) => r === "/" },
  { href: "#/games", label: "Games", active: (r: string) => r.startsWith("/games") },
  { href: "#/players", label: "Players", active: (r: string) => r.startsWith("/players") },
  { href: "#/analytics", label: "Analytics", active: (r: string) => r.startsWith("/analytics") },
];

export function Header({
  route,
  theme,
  onToggleTheme,
}: {
  route: string;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#/" aria-label="Ball is Life, home">
          <span className="brand-ball" aria-hidden="true" />
          <span className="brand-text">Ball is Life</span>
        </a>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={item.active(route) ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          className="btn btn-ghost theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "☀ Light" : "☾ Dark"}
        </button>
      </div>
    </header>
  );
}
