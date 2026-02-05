import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/contexts/Theme.context"
import s from "./ThemeToggle.module.scss"

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme()
	const isDark = theme === "dark"

	return (
		<button
			type="button"
			className={s.btn}
			onClick={toggleTheme}
			aria-label={isDark ? "Usar modo claro" : "Usar modo oscuro"}
			title={isDark ? "Modo claro" : "Modo oscuro"}
			data-cy="theme-toggle"
		>
			{isDark ? (
				<Sun className={s.icon} size={20} aria-hidden />
			) : (
				<Moon className={s.icon} size={20} aria-hidden />
			)}
		</button>
	)
}
