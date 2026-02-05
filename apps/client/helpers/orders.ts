import type { Order } from "@kds/shared";
import { OrderStatus } from "@kds/shared";

export function getPreviousStatus(status: OrderStatus): OrderStatus | null {
	switch (status) {
		case OrderStatus.IN_PROGRESS:
			return OrderStatus.PENDING;
		case OrderStatus.READY:
			return OrderStatus.IN_PROGRESS;
		case OrderStatus.DELIVERED:
			return OrderStatus.READY;
		default:
			return null;
	}
}

export function classifyOrders(orders: Order[]) {
	const pending: Order[] = [];
	const inProgress: Order[] = [];
	const ready: Order[] = [];
	const delivered: Order[] = [];
	const ordersWithRider: Order[] = [];
	let readyWithRider: Order[] = [];
	let readyWithoutRider: Order[] = [];

	for (let i = 0; i < orders.length; i++) {
		const order = orders[i];
		switch (order.status) {
			case OrderStatus.PENDING:
				pending.push(order);
				break;
			case OrderStatus.IN_PROGRESS:
				inProgress.push(order);
				break;
			case OrderStatus.READY:
				ready.push(order);
				if (order.riderArrivedAt) {
					readyWithRider.push(order);
				} else {
					readyWithoutRider.push(order);
				}
				break;
			case OrderStatus.DELIVERED:
				delivered.push(order);
				break;
			default:
				break;
		}
		if (order.riderArrivedAt && order.status !== OrderStatus.DELIVERED) {
			ordersWithRider.push(order);
		}
	}

	return {
		pending,
		inProgress,
		ready,
		delivered,
		ordersWithRider,
		readyWithRider,
		readyWithoutRider,
	};
}
