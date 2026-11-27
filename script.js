(() => {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const toggleLabel = document.getElementById("theme-toggle-label");
  const year = document.getElementById("year");
  const storageKey = "theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const getStoredTheme = () => {
    try {
      const value = localStorage.getItem(storageKey);
      return value === "day" || value === "night" ? value : null;
    } catch {
      return null;
    }
  };

  const applyTheme = (theme) => {
    const next = theme === "night" ? "night" : "day";
    root.dataset.theme = next;

    if (toggle) {
      const isNight = next === "night";
      toggle.setAttribute("aria-pressed", String(isNight));
      toggle.setAttribute("aria-label", isNight ? "Switch to day mode" : "Switch to night mode");
      if (toggleLabel) {
        toggleLabel.textContent = isNight ? "Day" : "Night";
      }
    }
  };

  applyTheme(getStoredTheme() || root.dataset.theme || (media.matches ? "night" : "day"));

  toggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "night" ? "day" : "night";
    applyTheme(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Ignore storage failures; theme still works for the current session.
    }
  });

  const handleSystemChange = (event) => {
    if (!getStoredTheme()) {
      applyTheme(event.matches ? "night" : "day");
    }
  };

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handleSystemChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(handleSystemChange);
  }

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
})();
