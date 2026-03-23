import { useState, useEffect } from "react";

type Theme = "light" | "dark";

export function useTheme() {
    // 1. Initialize state from localStorage or system preference (default to light)
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("theme") as Theme | null;
            if (stored === "light" || stored === "dark") {
                return stored;
            }
            // Optional: fallback to system preference
            // if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            //     return "dark";
            // }
        }
        return "light";
    });

    // 2. Sync theme with HTML class and localStorage whenever it changes
    useEffect(() => {
        const root = document.documentElement;
        if (theme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    // 3. Helper to toggle theme
    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    return { theme, setTheme, toggleTheme };
}
