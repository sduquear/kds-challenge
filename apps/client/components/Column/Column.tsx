import { memo } from "react";
import OrderDuration from "@/components/OrderDuration/OrderDuration";
import { Clock, Bike, Pencil } from "lucide-react";
import type { Order } from "@kds/shared";
import { OrderStatus } from "@kds/shared";
import s from "./Column.module.scss";
import classNames from "classnames";
import { formatPrice } from "@/helpers/utilities";
import { getPreviousStatus } from "@/helpers/orders";

export type ColumnProps = {
  orders: Order[];
  title: string;
  count?: number;
  onClick?: (order: Order) => void;
  onGoBack?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  status?: OrderStatus;
  isReadyColumn?: boolean;
  isHistory?: boolean;
};

function getOrderTotal(
  order: Order,
): { amount: number; currency: string } | null {
  if (order.total?.amount != null && order.total.currency) {
    return order.total;
  }
  if (!order.items?.length) return null;
  const amount = order.items.reduce(
    (sum, item) => sum + (item.price?.amount ?? 0) * item.quantity,
    0,
  );
  const currency = order.items[0]?.price?.currency ?? "EUR";
  return amount > 0 ? { amount, currency } : null;
}

function Column({
  orders,
  title,
  count,
  onClick,
  onGoBack,
  onEdit,
  status,
  isReadyColumn,
  isHistory,
}: ColumnProps) {
  return (
    <div
      className={classNames(s["pk-column"], {
        [s["pk-column--history"]]: isHistory,
        [s["pk-column--ready"]]: isReadyColumn,
        [s["pk-column--status-pending"]]: status === OrderStatus.PENDING,
        [s["pk-column--status-in-progress"]]:
          status === OrderStatus.IN_PROGRESS,
        [s["pk-column--status-ready"]]: status === OrderStatus.READY,
      })}
      data-cy={status ? `kanban-column-${status.toLowerCase()}` : undefined}
    >
      <div className={s["pk-column__title"]}>
        <h3>{title}</h3>
        {count !== undefined && (
          <span className={s["pk-column__count"]}>{count}</span>
        )}
      </div>

      <div className={s["pk-column__cards"]}>
        {orders.map((order) => {
          const hasRider = !!order.riderArrivedAt;
          const orderTotal = getOrderTotal(order);
          const isClickable = isReadyColumn
            ? hasRider && !!onClick
            : !!onClick && !isHistory;
          const canGoBack =
            !!onGoBack && getPreviousStatus(order.status) !== null;

          const cardContent = (
            <>
              <div className={s["pk-card__header"]}>
                <span className={s["pk-card__id"]}>{order.externalId}</span>
                <div className={s["pk-card__meta"]}>
                  <span className={s["pk-card__customer"]}>
                    {order.customerName}
                  </span>
                </div>
              </div>

              <div
                className={s["pk-card__duration"]}
                aria-label="Tiempo del pedido"
              >
                <Clock
                  className={s["pk-card__duration-icon"]}
                  size={18}
                  aria-hidden
                />
                <span className={s["pk-card__duration-value"]}>
                  <OrderDuration
                    startTime={order.createdAt}
                    endTime={
                      order.status === OrderStatus.DELIVERED
                        ? order.updatedAt
                        : undefined
                    }
                  />
                </span>
              </div>
              <div className={s["pk-card__items"]}>
                {order.items.map((item, idx) => (
                  <div key={item.id || idx} className={s["pk-card__item"]}>
                    <span className={s["pk-card__item-qty"]}>
                      {item.quantity}x
                    </span>
                    <span className={s["pk-card__item-name"]}>{item.name}</span>
                    {item.price && (
                      <span
                        className={s["pk-card__item-unit-price"]}
                        title="Precio unitario"
                      >
                        {formatPrice(item.price.amount, item.price.currency)}/ud
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {orderTotal && (
                <div className={s["pk-card__total"]}>
                  <span className={s["pk-card__total-label"]}>Total</span>
                  <span className={s["pk-card__total-value"]}>
                    {formatPrice(orderTotal.amount, orderTotal.currency)}
                  </span>
                </div>
              )}

              {hasRider && !isHistory && (
                <div className={s["pk-card__rider"]}>
                  <Bike
                    className={s["pk-card__rider-icon"]}
                    size={14}
                    aria-hidden
                  />
                  Rider esperando
                </div>
              )}

              {isReadyColumn && !hasRider && (
                <div className={s["pk-card__waiting"]}>
                  <span className={s["pk-card__waiting-dot"]} />
                  Esperando rider…
                </div>
              )}
            </>
          );

          return (
            <div
              key={order._id}
              data-status={order.status}
              data-ready-with-rider={
                isReadyColumn && hasRider ? "true" : undefined
              }
              className={classNames(s["pk-card"], {
                [s["pk-card--clickable"]]: isClickable,
                [s["pk-card--ready-with-rider"]]: isReadyColumn && hasRider,
                [s["pk-card--ready-no-rider"]]: isReadyColumn && !hasRider,
                [s["pk-card--delivered"]]: isHistory,
                [s["pk-card--has-rider"]]:
                  hasRider && !isReadyColumn && !isHistory,
              })}
            >
              {isClickable ? (
                <button
                  type="button"
                  className={s["pk-card__trigger"]}
                  onClick={() => onClick?.(order)}
                  aria-label={
                    isReadyColumn
                      ? `Entregar orden ${order.externalId}`
                      : `Avanzar orden ${order.externalId}`
                  }
                >
                  {cardContent}
                </button>
              ) : (
                cardContent
              )}

              {(isClickable || canGoBack || (onEdit && !isHistory)) && (
                <div className={s["pk-card__action-row"]}>
                  <div className={s["pk-card__action-buttons"]}>
                    {canGoBack && (
                      <button
                        type="button"
                        className={s["pk-card__back"]}
                        onClick={(e) => {
                          e.stopPropagation();
                          onGoBack?.(order);
                        }}
                      >
                        ← Volver
                      </button>
                    )}
                    {onEdit && !isHistory && (
                      <button
                        type="button"
                        className={s["pk-card__edit"]}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(order);
                        }}
                        aria-label="Editar orden"
                      >
                        <Pencil
                          className={s["pk-card__edit-icon"]}
                          size={14}
                          aria-hidden
                        />
                        Editar
                      </button>
                    )}
                  </div>
                  {isClickable && (
                    <div className={s["pk-card__action"]}>
                      {isReadyColumn
                        ? "Click para entregar ✓"
                        : "Click para avanzar →"}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className={s["pk-column__empty"]}>Sin órdenes</div>
        )}
      </div>
    </div>
  );
}

export default memo(Column);
