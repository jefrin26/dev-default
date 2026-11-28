import { useEffect, useState } from "react";

type Theme = "day" | "night";

export function Header() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "night" ? "night" : "day",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // Theme still works for this session if storage is unavailable.
    }
  }, [theme]);

  const isNight = theme === "night";

  return (
    <header className="header">
      <div className="brand" title="Dev server">
        <span className="brand-dot" aria-hidden="true" />
        <span className="brand-name">dev.enyard.in</span>
      </div>

      <button
        className="theme-toggle"
        type="button"
        aria-label={isNight ? "Switch to day mode" : "Switch to night mode"}
        aria-pressed={isNight}
        onClick={() => setTheme(isNight ? "day" : "night")}
      >
        <span className="toggle-track" aria-hidden="true">
          <svg
            className="icon icon-sun"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2.5M12 19v2.5M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2.5 12H5M19 12h2.5M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
          </svg>
          <svg
            className="icon icon-moon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
          </svg>
          <span className="toggle-thumb" />
        </span>
        <span className="toggle-label">{isNight ? "Day" : "Night"}</span>
      </button>
    </header>
  );
}
