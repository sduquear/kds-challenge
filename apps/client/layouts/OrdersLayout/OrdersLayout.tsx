import { useState, useEffect, useCallback, useMemo } from "react"
import { Plus, BarChart3, Play, Pause, Loader2, X } from "lucide-react"
import { MAX_ORDERS, type Order } from "@kds/shared"
import Logo from "@/bases/Logo/Logo"
import s from "./OrdersLayout.module.scss"
import Kanban from "@/components/Kanban/Kanban"
import { SoundToggle } from "@/components/SoundToggle/SoundToggle"
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle"
import { CreateOrderModal } from "@/components/CreateOrderModal/CreateOrderModal"
import { apiService } from "@/services/api.service"
import { useOrders } from "@/contexts/Orders.context"
import { classifyOrders } from "@/helpers/orders"

export type OrdersLayoutProps = {
  initialSimulationStatus?: { isRunning: boolean }
}

export default function OrdersLayout({ initialSimulationStatus }: OrdersLayoutProps = {}) {
  const [isSimulationRunning, setIsSimulationRunning] = useState(
    () => initialSimulationStatus?.isRunning ?? false
  );
  const [isToggling, setIsToggling] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const { orders, createOrder, updateOrder, lastSimulationStop } = useOrders();

  const isModalOpen = createOrderOpen || orderToEdit != null;

  const closeModal = useCallback(() => {
    setCreateOrderOpen(false);
    setOrderToEdit(null);
  }, []);

  const handleOrderSubmit = useCallback(
    async (payload: Parameters<typeof createOrder>[0]) => {
      if (orderToEdit?._id) {
        await updateOrder(orderToEdit._id, payload);
      } else {
        await createOrder(payload);
      }
      closeModal();
    },
    [orderToEdit, updateOrder, createOrder, closeModal]
  );

  useEffect(() => {
    if (initialSimulationStatus != null) return;
    apiService.getSimulationStatus()
      .then((data) => setIsSimulationRunning(data.isRunning))
      .catch(() => { });
  }, [initialSimulationStatus]);

  useEffect(() => {
    if (lastSimulationStop) {
      setIsSimulationRunning(false);
    }
  }, [lastSimulationStop]);

  useEffect(() => {
    if (!metricsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMetricsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [metricsOpen]);

  const handleToggle = useCallback(async () => {
    setIsToggling(true);
    try {
      const result = await apiService.toggleSimulation();
      setIsSimulationRunning(result.status === 'started');
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Error toggling simulation:', err);
    } finally {
      setIsToggling(false);
    }
  }, []);

  const {
    pending: pendingOrders,
    inProgress: inProgressOrders,
    readyWithRider,
    readyWithoutRider,
    delivered: deliveredOrders,
  } = useMemo(() => classifyOrders(orders), [orders]);

  const avgDeliveryTimeMinutes = useMemo(() => {
    const withTimes = deliveredOrders.filter(
      (o) => o.createdAt != null && o.updatedAt != null
    );
    if (withTimes.length === 0) return null;
    const totalMs = withTimes.reduce(
      (sum, o) => sum + (new Date(o.updatedAt!).getTime() - new Date(o.createdAt!).getTime()),
      0
    );
    return Math.round((totalMs / withTimes.length) / 60_000 * 10) / 10;
  }, [deliveredOrders]);

  return (
    <main className={s["pk-layout"]}>
      <nav className={s["pk-layout__navbar"]}>
        <div className={s["pk-layout__navbar-left"]}>
          <Logo size="M" />
          <strong>KDS: Krazy Display Service</strong>
        </div>
        <div className={s["pk-layout__navbar-actions"]}>
          <div className={s["pk-layout__navbar-actions-group"]}>
            <button
              type="button"
              className={`${s["pk-layout__metrics-btn"]} ${metricsOpen ? s["pk-layout__metrics-btn--selected"] : ""}`}
              onClick={() => setMetricsOpen(true)}
              aria-label="Métricas"
              title="Métricas"
              aria-pressed={metricsOpen}
              data-cy="metrics-btn"
            >
              <BarChart3 className={s["pk-layout__metrics-icon"]} size={20} aria-hidden />
            </button>
            <button
              type="button"
              className={s["pk-layout__create-order-btn"]}
              onClick={() => setCreateOrderOpen(true)}
              aria-label="Crear orden"
              title="Crear orden"
              data-cy="create-order-btn"
            >
              <Plus className={s["pk-layout__create-order-icon"]} size={20} aria-hidden />
            </button>
            <button
              type="button"
              className={`${s["pk-layout__sim-btn"]} ${isSimulationRunning ? s["pk-layout__sim-btn--active"] : ""}`}
              onClick={handleToggle}
              disabled={isToggling}
              aria-label={isSimulationRunning ? "Detener simulación" : "Iniciar simulación"}
              title={isSimulationRunning ? "Detener simulación" : "Iniciar simulación"}
              data-cy="sim-toggle-btn"
            >
              {isToggling ? (
                <Loader2
                  className={`${s["pk-layout__sim-icon"]} ${s["pk-layout__sim-spinner"]}`}
                  size={20}
                  aria-hidden
                />
              ) : isSimulationRunning ? (
                <Pause className={s["pk-layout__sim-icon"]} size={20} aria-hidden />
              ) : (
                <Play className={s["pk-layout__sim-icon"]} size={20} aria-hidden />
              )}
            </button>
          </div>
          <span className={s["pk-layout__navbar-divider"]} aria-hidden />
          <div className={s["pk-layout__navbar-actions-group"]}>
            <ThemeToggle />
            <SoundToggle />
          </div>
        </div>
      </nav>
      <article className={s["pk-layout__app"]}>
        <Kanban onEditOrder={(order) => setOrderToEdit(order)} />
      </article>

      {isModalOpen && (
        <CreateOrderModal
          onClose={closeModal}
          onSubmit={handleOrderSubmit}
          initialOrder={orderToEdit ?? undefined}
        />
      )}

      {metricsOpen && (
        <div
          className={s["pk-modal-backdrop"]}
          onClick={() => setMetricsOpen(false)}
          role="presentation"
        >
          <div
            className={s["pk-modal"]}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="metrics-title"
            data-cy="metrics-dialog"
          >
            <div className={s["pk-modal__header"]}>
              <h2 id="metrics-title" className={s["pk-modal__title"]}>
                Estado de Entregas
              </h2>
              <button
                type="button"
                className={s["pk-modal__close"]}
                onClick={() => setMetricsOpen(false)}
                aria-label="Cerrar"
                data-cy="metrics-dialog-close"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className={s["pk-modal__body"]}>
              <div className={s["pk-modal__stats"]}>
                <div className={`${s["pk-modal__stat"]} ${s["pk-modal__stat--full"]}`}>
                  <span className={s["pk-modal__stat-value"]}>
                    {orders.length} / {MAX_ORDERS}
                  </span>
                  <span className={s["pk-modal__stat-label"]}>Total / Stock</span>
                </div>
                <div className={s["pk-modal__stat"]}>
                  <span className={s["pk-modal__stat-value"]}>
                    {pendingOrders.length + inProgressOrders.length}
                  </span>
                  <span className={s["pk-modal__stat-label"]}>En proceso</span>
                </div>
                <div className={s["pk-modal__stat"]}>
                  <span className={`${s["pk-modal__stat-value"]} ${s["pk-modal__stat-value--ready"]}`}>
                    {readyWithRider.length}
                  </span>
                  <span className={s["pk-modal__stat-label"]}>Para entregar</span>
                </div>
                <div className={s["pk-modal__stat"]}>
                  <span className={`${s["pk-modal__stat-value"]} ${s["pk-modal__stat-value--waiting"]}`}>
                    {readyWithoutRider.length}
                  </span>
                  <span className={s["pk-modal__stat-label"]}>Sin rider</span>
                </div>
                <div className={s["pk-modal__stat"]}>
                  <span className={`${s["pk-modal__stat-value"]} ${s["pk-modal__stat-value--delivered"]}`}>
                    {deliveredOrders.length}
                  </span>
                  <span className={s["pk-modal__stat-label"]}>Entregados</span>
                </div>
                <div className={`${s["pk-modal__stat"]} ${s["pk-modal__stat--full"]}`}>
                  <span className={s["pk-modal__stat-value"]}>
                    {avgDeliveryTimeMinutes != null
                      ? `${avgDeliveryTimeMinutes} min`
                      : "—"}
                  </span>
                  <span className={s["pk-modal__stat-label"]}>
                    Tiempo medio (entrada → entrega)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
