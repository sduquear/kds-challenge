import { useCallback, useMemo, useState } from 'react';
import { Bike } from 'lucide-react';
import { OrderStatus } from '@kds/shared';
import s from './Kanban.module.scss';
import Column from '@/components/Column/Column';
import { useOrders } from '@/contexts/Orders.context';
import { classifyOrders, getPreviousStatus } from '@/helpers/orders';
import type { Order } from '@kds/shared';

export type KanbanProps = {
	onEditOrder?: (order: Order) => void;
};

export default function Kanban({ onEditOrder }: KanbanProps = {}) {
	const { orders, now, updateStatus, isLoading, isPending, isConnected, error } = useOrders();
	const [updateError, setUpdateError] = useState<string | null>(null);

	const {
		pending: pendingOrders,
		inProgress: inProgressOrders,
		ready: readyOrders,
		delivered: deliveredOrders,
		ordersWithRider,
	} = useMemo(() => classifyOrders(orders), [orders]);

	const handleStatusUpdate = useCallback(
		async (order: Order, newStatus: OrderStatus) => {
			try {
				setUpdateError(null);
				await updateStatus(order._id!, newStatus);
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Error updating order';
				setUpdateError(message);
				setTimeout(() => setUpdateError(null), 5000);
			}
		},
		[updateStatus]
	);

	const handlePendingClick = useCallback(
		(order: Order) => handleStatusUpdate(order, OrderStatus.IN_PROGRESS),
		[handleStatusUpdate]
	);

	const handleInProgressClick = useCallback(
		(order: Order) => handleStatusUpdate(order, OrderStatus.READY),
		[handleStatusUpdate]
	);

	const handleReadyClick = useCallback(
		(order: Order) => handleStatusUpdate(order, OrderStatus.DELIVERED),
		[handleStatusUpdate]
	);

	const handleGoBack = useCallback(
		(order: Order) => {
			const prev = getPreviousStatus(order.status);
			if (prev) handleStatusUpdate(order, prev);
		},
		[handleStatusUpdate]
	);

	if (isLoading) {
		return (
			<section className={s['pk-kanban']} data-cy="kanban">
				<div className={s['pk-kanban__loading']}>Cargando órdenes…</div>
			</section>
		);
	}

	return (
		<section className={s['pk-kanban']} data-cy="kanban">
			<div className={s['pk-kanban__header']}>
				<div className={s['pk-kanban__status']}>
					<span
						className={`${s['pk-kanban__indicator']} ${isConnected ? s['pk-kanban__indicator--connected'] : s['pk-kanban__indicator--disconnected']}`}
					/>
					{isConnected ? 'Conectado' : 'Reconectando…'}
				</div>
				{isPending && (
					<span className={s['pk-kanban__pending']} aria-live="polite">
						Actualizando…
					</span>
				)}

				{(error || updateError) && (
					<div className={s['pk-kanban__error']} role="alert" aria-live="polite">
						{error || updateError}
					</div>
				)}
			</div>

			<div className={s['pk-kanban__content']}>
				<div className={s['pk-kanban__columns']}>
					<Column
						title="Pendiente"
						orders={pendingOrders}
						now={now}
						onClick={handlePendingClick}
						onGoBack={handleGoBack}
						onEdit={onEditOrder}
						count={pendingOrders.length}
						status={OrderStatus.PENDING}
					/>
					<Column
						title="En preparación"
						orders={inProgressOrders}
						now={now}
						onClick={handleInProgressClick}
						onGoBack={handleGoBack}
						onEdit={onEditOrder}
						count={inProgressOrders.length}
						status={OrderStatus.IN_PROGRESS}
					/>
					<Column
						title="Listo para recoger"
						orders={readyOrders}
						now={now}
						onClick={handleReadyClick}
						onGoBack={handleGoBack}
						onEdit={onEditOrder}
						count={readyOrders.length}
						status={OrderStatus.READY}
						isReadyColumn
					/>
				</div>

				<div className={s['pk-kanban__panel']}>
					<div className={s['pk-kanban__panel-inner']}>
						<div className={`${s['pk-panel']} ${s['pk-panel--riders']}`}>
						<div className={s['pk-panel__header']}>
							<h3>Riders</h3>
							<span className={s['pk-panel__count']}>{ordersWithRider.length}</span>
						</div>
						<div className={s['pk-panel__content']}>
							{ordersWithRider.length > 0 ? (
								ordersWithRider.map((order) => {
									const isReady = order.status === OrderStatus.READY;
									return (
										<div
											key={order._id}
											className={`${s['pk-panel__item']} ${s['pk-panel__item--rider']} ${isReady ? s['pk-panel__item--rider-ready'] : ''}`}
										>
											<Bike className={s['pk-panel__rider-icon']} size={20} aria-hidden />
											<div className={s['pk-panel__rider-body']}>
												<span className={s['pk-panel__item-id']}>{order.externalId}</span>
											</div>
											<span className={`${s['pk-panel__item-badge']} ${isReady ? s['pk-panel__item-badge--ready'] : s['pk-panel__item-badge--waiting']}`}>
												{isReady ? 'Listo' : 'Esperando'}
											</span>
										</div>
									);
								})
							) : (
								<div className={s['pk-panel__empty']}>Sin riders</div>
							)}
						</div>
						</div>

						<div className={`${s['pk-panel']} ${s['pk-panel--history']}`}>
						<div className={s['pk-panel__header']}>
							<h3>Historial</h3>
							<span className={s['pk-panel__count']}>{deliveredOrders.length}</span>
						</div>
						<div className={s['pk-panel__content']}>
							{deliveredOrders.length > 0 ? (
								deliveredOrders.map((order) => (
									<div key={order._id} className={`${s['pk-panel__item']} ${s['pk-panel__item--delivered']}`}>
										<div className={s['pk-panel__item-main']}>
											<span className={s['pk-panel__item-id']}>{order.externalId}</span>
										</div>
										<button
											type="button"
											className={s['pk-panel__item-back']}
											onClick={() => handleGoBack(order)}
										>
											← Volver
										</button>
									</div>
								))
							) : (
								<div className={s['pk-panel__empty']}>Sin entregas</div>
							)}
						</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
