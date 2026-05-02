/**
 * @fileoverview ThemeContext — application-wide dark/light mode state.
 *
 * ISSUE: #134 (Support dark mode themes in CustomerList & Global UI)
 * Category: Feature Enhancement
 * * Persists the user's theme preference to `localStorage` under the key
 * `tradazone_theme` and applies/removes the `dark` class on
 * `document.documentElement` so Tailwind's `dark:` variants work globally.
 *
 * ## Why this is separate from AuthContext
 * Theme preference is a UI concern that is independent of authentication and
 * wallet state. Keeping it here avoids polluting AuthContext with unrelated
 * state and lets any component toggle the theme without touching auth logic.
 *
 * @module ThemeContext
 */

import { createContext, useContext, useEffect, useState } from "react";

const THEME_KEY = "tradazone_theme";

const ThemeContext = createContext(null);

/**
 * @typedef {Object} ThemeContextValue
 * @property {boolean}    isDark     - `true` when dark mode is active.
 * @property {() => void} toggleTheme - Toggles between dark and light mode.
 */

/**
 * ThemeProvider
 *
 * Wraps the application with theme state. Must be an ancestor of any
 * component that calls {@link useTheme}.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem(THEME_KEY);
        // If user has a saved preference, use it.
        if (stored) return stored === "dark";
        // Otherwise, fallback to system preference.
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    useEffect(() => {
        // Sync the DOM class with the state
        const root = window.document.documentElement;
        if (isDark) {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
        localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    }, [isDark]);

    // Optional: Sync with system changes if no manual override exists
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e) => {
            if (!localStorage.getItem(THEME_KEY)) {
                setIsDark(e.matches);
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    const toggleTheme = () => setIsDark((prev) => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

/**
 * useTheme
 *
 * Returns the {@link ThemeContextValue} from the nearest `ThemeProvider`.
 * Throws if called outside of a `ThemeProvider` tree.
 *
 * @returns {ThemeContextValue}
 * @throws {Error} If called outside a `ThemeProvider`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within a ThemeProvider");
    return context;
}