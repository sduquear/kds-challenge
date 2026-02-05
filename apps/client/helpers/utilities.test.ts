import { describe, expect, it } from "vitest"
import {
	formatDuration,
	formatPrice,
	getRandomId,
	getRandomInterval,
} from "./utilities"

describe("utilities", () => {
	describe("formatDuration", () => {
		it("formatea milisegundos en m:ss", () => {
			expect(formatDuration(0)).toBe("0:00")
			expect(formatDuration(65_000)).toBe("1:05")
			expect(formatDuration(90_000)).toBe("1:30")
		})

		it("devuelve 0:00 para valores inválidos", () => {
			expect(formatDuration(-100)).toBe("0:00")
			expect(formatDuration(Number.NaN)).toBe("0:00")
		})

		it("formatea duraciones largas en horas y minutos", () => {
			expect(formatDuration(3_600_000)).toBe("1h 0m")
			expect(formatDuration(7_350_000)).toBe("2h 2m")
		})
	})

	describe("formatPrice", () => {
		it("formatea cantidad en céntimos a moneda (es-ES)", () => {
			expect(formatPrice(1250, "EUR")).toMatch(/12,50/)
			expect(formatPrice(0, "EUR")).toMatch(/0,00/)
		})

		it("usa EUR por defecto si currency está vacía", () => {
			expect(formatPrice(100, "")).toMatch(/1,00/)
		})
	})

	describe("getRandomId", () => {
		it("devuelve un string de longitud 5", () => {
			const id = getRandomId()
			expect(id).toHaveLength(5)
			expect(id).toMatch(/^\d{5}$/)
		})
	})

	describe("getRandomInterval", () => {
		it("devuelve un número entre min y max (inclusive)", () => {
			const min = 10
			const max = 20
			for (let i = 0; i < 50; i++) {
				const n = getRandomInterval(min, max)
				expect(n).toBeGreaterThanOrEqual(min)
				expect(n).toBeLessThanOrEqual(max)
			}
		})
	})
})
