import { OrderStatus } from "@kds/shared"
import { describe, expect, it } from "vitest"
import { classifyOrders } from "./orders"

const createMockOrder = (
	overrides: Partial<{
		_id: string
		externalId: string
		status: OrderStatus
		customerName: string
		riderArrivedAt: Date | undefined
	}> = {},
) => ({
	_id: "id1",
	customerName: "Test",
	externalId: "EXT-001",
	items: [],
	status: OrderStatus.PENDING,
	...overrides,
})

describe("classifyOrders", () => {
	describe("por status", () => {
		it("clasifica órdenes por status", () => {
			const orders = [
				createMockOrder({
					externalId: "GLO-001",
					status: OrderStatus.PENDING,
				}),
				createMockOrder({
					externalId: "GLO-002",
					status: OrderStatus.IN_PROGRESS,
				}),
				createMockOrder({ externalId: "GLO-003", status: OrderStatus.READY }),
				createMockOrder({
					externalId: "GLO-004",
					status: OrderStatus.DELIVERED,
				}),
			]

			const result = classifyOrders(orders)

			expect(result.pending).toHaveLength(1)
			expect(result.pending[0].externalId).toBe("GLO-001")
			expect(result.inProgress).toHaveLength(1)
			expect(result.inProgress[0].externalId).toBe("GLO-002")
			expect(result.ready).toHaveLength(1)
			expect(result.ready[0].externalId).toBe("GLO-003")
			expect(result.delivered).toHaveLength(1)
			expect(result.delivered[0].externalId).toBe("GLO-004")
		})
	})

	describe("READY con y sin rider", () => {
		it("separa READY con y sin rider", () => {
			const orders = [
				createMockOrder({
					externalId: "GLO-005",
					riderArrivedAt: new Date(),
					status: OrderStatus.READY,
				}),
				createMockOrder({
					externalId: "GLO-006",
					riderArrivedAt: undefined,
					status: OrderStatus.READY,
				}),
			]

			const result = classifyOrders(orders)

			expect(result.readyWithRider).toHaveLength(1)
			expect(result.readyWithRider[0].externalId).toBe("GLO-005")
			expect(result.readyWithoutRider).toHaveLength(1)
			expect(result.readyWithoutRider[0].externalId).toBe("GLO-006")
		})
	})

	describe("edge cases", () => {
		it("devuelve listas vacías para array vacío", () => {
			const result = classifyOrders([])

			expect(result.pending).toEqual([])
			expect(result.inProgress).toEqual([])
			expect(result.ready).toEqual([])
			expect(result.delivered).toEqual([])
			expect(result.ordersWithRider).toEqual([])
			expect(result.readyWithRider).toEqual([])
			expect(result.readyWithoutRider).toEqual([])
		})

		it("ignora status desconocido y no rompe", () => {
			const orders = [
				createMockOrder({
					externalId: "GLO-007",
					status: "UNKNOWN" as OrderStatus,
				}),
			]

			const result = classifyOrders(orders)

			expect(result.pending).toHaveLength(0)
			expect(result.inProgress).toHaveLength(0)
			expect(result.ready).toHaveLength(0)
			expect(result.delivered).toHaveLength(0)
			expect(result.ordersWithRider).toHaveLength(0)
		})
	})
})
