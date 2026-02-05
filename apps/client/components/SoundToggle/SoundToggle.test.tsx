import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { useSound } from "@/contexts/Sound.context"
import { SoundToggle } from "./SoundToggle"

vi.mock("@/contexts/Sound.context", () => ({
	useSound: vi.fn(),
}))

describe("SoundToggle", () => {
	describe("render", () => {
		it("muestra botón con aria-label, aria-pressed y title cuando sonido activado", () => {
			vi.mocked(useSound).mockReturnValue({
				soundEnabled: true,
				toggleSound: vi.fn() as () => void,
			})

			render(<SoundToggle />)

			const btn = screen.getByRole("button", {
				name: /desactivar sonido/i,
			})
			expect(btn).toBeInTheDocument()
			expect(btn).toHaveAttribute("aria-pressed", "false")
			expect(btn).toHaveAttribute("title", "Desactivar sonido")
		})

		it("muestra aria-label, aria-pressed y title cuando sonido desactivado", () => {
			vi.mocked(useSound).mockReturnValue({
				soundEnabled: false,
				toggleSound: vi.fn() as () => void,
			})

			render(<SoundToggle />)

			const btn = screen.getByRole("button", { name: /activar sonido/i })
			expect(btn).toBeInTheDocument()
			expect(btn).toHaveAttribute("aria-pressed", "true")
			expect(btn).toHaveAttribute("title", "Activar sonido")
		})
	})

	describe("user interaction", () => {
		it("llama toggleSound al hacer click", async () => {
			const toggleSound = vi.fn()
			vi.mocked(useSound).mockReturnValue({
				soundEnabled: true,
				toggleSound,
			})

			render(<SoundToggle />)
			await userEvent.click(screen.getByRole("button"))

			expect(toggleSound).toHaveBeenCalledTimes(1)
		})
	})
})
