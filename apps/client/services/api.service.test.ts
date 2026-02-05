import { OrderStatus } from "@kds/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CreateOrderPayload } from "./api.service"
import { apiService } from "./api.service"

const mockOrder = {
	_id: "1",
	customerName: "Test",
	externalId: "EXT-001",
	items: [],
	status: OrderStatus.PENDING,
}

describe("apiService", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	describe("getOrders", () => {
		it("devuelve lista de órdenes", async () => {
			const mockOrders = [mockOrder]

			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve(mockOrders),
				ok: true,
			} as Response)

			const result = await apiService.getOrders()

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/orders"),
			)
			expect(result).toEqual(mockOrders)
		})

		it("getOrders lanza si response no ok", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: "Server Error",
			} as Response)

			await expect(apiService.getOrders()).rejects.toThrow(
				/Failed to fetch orders/,
			)
		})
	})

	describe("updateOrderStatus", () => {
		it("hace PATCH con status", async () => {
			const updated = { ...mockOrder, status: OrderStatus.IN_PROGRESS }

			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve(updated),
				ok: true,
			} as Response)

			const result = await apiService.updateOrderStatus(
				"1",
				OrderStatus.IN_PROGRESS,
			)

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/orders/1"),
				expect.objectContaining({
					body: JSON.stringify({ status: OrderStatus.IN_PROGRESS }),
					method: "PATCH",
				}),
			)
			expect(result.status).toBe(OrderStatus.IN_PROGRESS)
		})

		it("updateOrderStatus lanza con mensaje del body cuando response no ok", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({ message: "Invalid transition" }),
				ok: false,
				statusText: "Bad Request",
			} as Response)

			await expect(
				apiService.updateOrderStatus("1", OrderStatus.DELIVERED),
			).rejects.toThrow("Invalid transition")
		})

		it("updateOrderStatus usa statusText cuando response.json falla", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.reject(new Error("Invalid JSON")),
				ok: false,
				statusText: "Bad Request",
			} as Response)

			await expect(
				apiService.updateOrderStatus("1", OrderStatus.IN_PROGRESS),
			).rejects.toThrow("Bad Request")
		})

		it("updateOrderStatus usa fallback cuando body no tiene message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({}),
				ok: false,
				statusText: "Bad Request",
			} as Response)

			await expect(
				apiService.updateOrderStatus("1", OrderStatus.IN_PROGRESS),
			).rejects.toThrow("Failed to update order: Bad Request")
		})
	})

	describe("createOrder", () => {
		it("devuelve la orden creada", async () => {
			const payload: CreateOrderPayload = {
				customerName: "Cliente",
				items: [
					{
						id: "i1",
						name: "Item",
						price: { amount: 1000, currency: "EUR" },
						quantity: 1,
					},
				],
			}

			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({ ...mockOrder, ...payload }),
				ok: true,
			} as Response)

			const result = await apiService.createOrder(payload)

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/orders"),
				expect.objectContaining({
					body: JSON.stringify(payload),
					method: "POST",
				}),
			)
			expect(result.customerName).toBe("Cliente")
		})

		it("createOrder lanza si response no ok", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({ message: "Order exists" }),
				ok: false,
				statusText: "Conflict",
			} as Response)

			await expect(
				apiService.createOrder({
					customerName: "X",
					items: [],
				}),
			).rejects.toThrow("Order exists")
		})

		it("createOrder usa fallback cuando body no tiene message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({}),
				ok: false,
				statusText: "Conflict",
			} as Response)

			await expect(
				apiService.createOrder({ customerName: "X", items: [] }),
			).rejects.toThrow("Failed to create order: Conflict")
		})
	})

	describe("getOrder", () => {
		it("devuelve la orden", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve(mockOrder),
				ok: true,
			} as Response)

			const result = await apiService.getOrder("1")

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/orders/1"),
			)
			expect(result._id).toBe("1")
		})

		it("getOrder lanza si response no ok", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: "Not Found",
			} as Response)

			await expect(apiService.getOrder("x")).rejects.toThrow(
				/Failed to fetch order/,
			)
		})
	})

	describe("updateOrder", () => {
		it("hace PATCH con payload", async () => {
			const payload = { customerName: "Nuevo nombre" }

			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({ ...mockOrder, ...payload }),
				ok: true,
			} as Response)

			const result = await apiService.updateOrder("1", payload)

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/orders/1"),
				expect.objectContaining({
					body: JSON.stringify(payload),
					method: "PATCH",
				}),
			)
			expect(result.customerName).toBe("Nuevo nombre")
		})

		it("updateOrder lanza si response no ok", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({ message: "Validation failed" }),
				ok: false,
				statusText: "Bad Request",
			} as Response)

			await expect(
				apiService.updateOrder("1", { customerName: "" }),
			).rejects.toThrow("Validation failed")
		})

		it("updateOrder usa fallback cuando body no tiene message", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({}),
				ok: false,
				statusText: "Bad Request",
			} as Response)

			await expect(
				apiService.updateOrder("1", { customerName: "" }),
			).rejects.toThrow("Failed to update order: Bad Request")
		})
	})

	describe("getSimulationStatus", () => {
		it("devuelve isRunning", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({ isRunning: true }),
				ok: true,
			} as Response)

			const result = await apiService.getSimulationStatus()

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/simulation/status"),
			)
			expect(result.isRunning).toBe(true)
		})

		it("getSimulationStatus lanza si response no ok", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: "Server Error",
			} as Response)

			await expect(apiService.getSimulationStatus()).rejects.toThrow(
				/Failed to fetch simulation status/,
			)
		})
	})

	describe("toggleSimulation", () => {
		it("devuelve status", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				json: () => Promise.resolve({ status: "started" }),
				ok: true,
			} as Response)

			const result = await apiService.toggleSimulation()

			expect(fetch).toHaveBeenCalledWith(
				expect.stringContaining("/simulation/toggle"),
				expect.objectContaining({ method: "POST" }),
			)
			expect(result.status).toBe("started")
		})

		it("toggleSimulation lanza si response no ok", async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				statusText: "Server Error",
			} as Response)

			await expect(apiService.toggleSimulation()).rejects.toThrow(
				/Failed to toggle simulation/,
			)
		})
	})
})
