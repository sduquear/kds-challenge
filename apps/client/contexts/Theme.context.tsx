import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react"

const STORAGE_KEY = "kds-theme"

export type Theme = "light" | "dark"

type ThemeContextValue = {
	theme: Theme
	setTheme: (theme: Theme) => void
	toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
	if (typeof window === "undefined") return "light"
	const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
	if (stored === "dark" || stored === "light") return stored
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<Theme>("light")
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setThemeState(getInitialTheme())
		setMounted(true)
	}, [])

	useEffect(() => {
		if (!mounted) return
		document.documentElement.setAttribute("data-theme", theme)
		document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light"
		localStorage.setItem(STORAGE_KEY, theme)
		const meta = document.querySelector('meta[name="theme-color"]')
		if (meta && meta instanceof HTMLMetaElement) {
			meta.content = theme === "dark" ? "#0d0d0d" : "#ffffff"
		}
	}, [theme, mounted])

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next)
	}, [])

	const toggleTheme = useCallback(() => {
		setThemeState((t) => (t === "light" ? "dark" : "light"))
	}, [])

	return (
		<ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	)
}

export function useTheme() {
	const ctx = useContext(ThemeContext)
	if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
	return ctx
}
