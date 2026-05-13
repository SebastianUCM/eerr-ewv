import { ref, watch } from "vue";

const STORAGE_KEY = "dashboard-fidelmira-theme";

/** @typedef {'light' | 'dark'} Theme */

function applyClass(/** @type {Theme} */ theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {
    /* ignore */
  }
  return "light";
}

/**
 * Tema claro/oscuro con clase en <html> (Tailwind `darkMode: 'class'`).
 */
export function useTheme() {
  const theme = ref(
    typeof localStorage !== "undefined" ? readStoredTheme() : "light"
  );

  watch(
    theme,
    (v) => {
      applyClass(v);
      try {
        localStorage.setItem(STORAGE_KEY, v);
      } catch {
        /* ignore */
      }
    },
    { immediate: true }
  );

  /** @param {Theme} t */
  function setTheme(t) {
    theme.value = t;
  }

  return { theme, setTheme };
}
