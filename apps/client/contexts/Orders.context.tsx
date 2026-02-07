import type { Order } from '@kds/shared';
import { OrderStatus, MAX_ORDERS } from '@kds/shared';
import type { CreateOrderPayload, UpdateOrderPayload } from '@/services/api.service';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { apiService } from '@/services/api.service';
import { useOrdersSocket } from '@/hooks/useOrdersSocket';
import { useToast } from '@/contexts/Toast.context';
import { useSound } from '@/contexts/Sound.context';
import { playNewOrderSound, playDeliveredSound } from '@/helpers/sounds';

export type OrdersContextProps = {
  orders: Order[];
  isLoading: boolean;
  isPending: boolean;
  isConnected: boolean;
  error: string | null;
  updateStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  createOrder: (payload: CreateOrderPayload) => Promise<Order>;
  updateOrder: (orderId: string, payload: UpdateOrderPayload) => Promise<Order>;
  lastSimulationStop: number | null;
};

export const OrdersContext = createContext<OrdersContextProps | null>(null);

export type OrdersProviderProps = {
  children: ReactNode;
  initialOrders?: Order[];
};

function getCreatedAt(order: Order): Date | undefined {
  const raw = order.createdAt;
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function normalizeOrderCreatedAt(order: Order): Order {
  const raw = order.createdAt;
  if (!raw) return order;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? order : { ...order, createdAt: d };
}

export function OrdersProvider({ children, initialOrders }: OrdersProviderProps) {
  const [orders, setOrders] = useState<Order[]>(() =>
    initialOrders?.map(normalizeOrderCreatedAt) ?? []
  );
  // Removed 'now' state and global interval to prevent re-renders
  const [isLoading, setIsLoading] = useState(initialOrders == null);
  const [error, setError] = useState<string | null>(null);

  const createdAtByOrderId = useRef<Record<string, number>>({});
  const initialOrdersRef = useRef(initialOrders);
  const [isPending, startTransition] = useTransition();


  const applyCreatedAt = useCallback((order: Order): Order => {
    if (!order._id) return order;
    const existing = createdAtByOrderId.current[order._id];
    const fromOrder = getCreatedAt(order);
    if (fromOrder !== undefined && (existing === undefined || fromOrder.getTime() < existing)) {
      createdAtByOrderId.current[order._id] = fromOrder.getTime();
    }
    const canonical = existing ?? fromOrder?.getTime();
    return canonical !== undefined ? { ...order, createdAt: new Date(canonical) } : order;
  }, []);

  const toast = useToast();
  const { soundEnabled } = useSound();

  const isCreatingOrderRef = useRef(false);
  const createdOrderIdRef = useRef<string | null>(null);

  const handleOrderCreated = useCallback(
    (newOrder: Order) => {
      const orderWithCreatedAt = applyCreatedAt(newOrder);
      setOrders((prev) => {
        const exists = prev.some((o) => o._id === newOrder._id);
        if (exists) return prev;
        return [orderWithCreatedAt, ...prev];
      });
      if (isCreatingOrderRef.current || (newOrder._id && newOrder._id === createdOrderIdRef.current)) {
        return;
      }
      const label = newOrder.externalId ? `#${newOrder.externalId}` : 'nueva';
      toast.addToast(`Nueva orden ${label}`, 'info');
      if (soundEnabled) playNewOrderSound();
    },
    [applyCreatedAt, toast, soundEnabled]
  );

  const handleOrderUpdated = useCallback(
    (updatedOrder: Order) => {
      const orderWithCreatedAt = applyCreatedAt(updatedOrder);
      const wasDelivered = updatedOrder.status === OrderStatus.DELIVERED;
      setOrders((prev) =>
        prev.map((order) =>
          order._id === updatedOrder._id ? orderWithCreatedAt : order
        )
      );
      if (wasDelivered) {
        const label = updatedOrder.externalId
          ? `#${updatedOrder.externalId}`
          : 'Orden';
        toast.addToast(`Orden ${label} entregada`, 'success');
        if (soundEnabled) playDeliveredSound();
      }
    },
    [applyCreatedAt, toast, soundEnabled]
  );

  const [lastSimulationStop, setLastSimulationStop] = useState<number | null>(null);

  const handleOrderLimitReached = useCallback(() => {
    toast.addToast(
      `Límite de ${MAX_ORDERS} órdenes alcanzado. No se recibirán más pedidos por hoy.`,
      'error',
      10000
    );
    setLastSimulationStop(Date.now());
  }, [toast]);

  const { isConnected, error: socketError } = useOrdersSocket({
    onOrderCreated: handleOrderCreated,
    onOrderUpdated: handleOrderUpdated,
    onOrderLimitReached: handleOrderLimitReached,
  });

  useEffect(() => {
    const initial = initialOrdersRef.current;
    if (initial != null) {
      initial.forEach((o) => applyCreatedAt(o));
      initialOrdersRef.current = undefined;
      return;
    }
    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiService.getOrders(undefined, MAX_ORDERS, 0);
        startTransition(() => {
          setOrders(data.map((o) => applyCreatedAt(o)));
          setIsLoading(false);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load orders';
        if (process.env.NODE_ENV === 'development') console.error('[Orders] Failed to load:', err);
        startTransition(() => {
          setError(message);
          setIsLoading(false);
        });
      }
    };
    loadOrders();
  }, [applyCreatedAt]);



  const updateStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      const previousOrders = orders;
      const currentOrder = orders.find((o) => o._id === orderId);

      if (!currentOrder) {
        throw new Error(`Order ${orderId} not found`);
      }

      const canonicalCreatedAt =
        createdAtByOrderId.current[orderId] !== undefined
          ? new Date(createdAtByOrderId.current[orderId])
          : currentOrder.createdAt;

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, status: newStatus, createdAt: canonicalCreatedAt }
            : order
        )
      );

      try {
        await apiService.updateOrderStatus(orderId, newStatus);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('[Orders] Update failed, rolling back:', err);
        setOrders(previousOrders);
        throw err;
      }
    },
    [orders]
  );

  const createOrder = useCallback(
    async (payload: CreateOrderPayload) => {
      isCreatingOrderRef.current = true;
      try {
        const newOrder = await apiService.createOrder(payload);
        if (newOrder._id) {
          createdOrderIdRef.current = newOrder._id;
          setTimeout(() => {
            createdOrderIdRef.current = null;
          }, 3000);
        }
        const orderWithCreatedAt = applyCreatedAt(newOrder);
        setOrders((prev) => {
          const exists = prev.some((o) => o._id === newOrder._id);
          if (exists) return prev;
          return [orderWithCreatedAt, ...prev];
        });
        toast.addToast(`Orden #${newOrder.externalId} creada`, 'success');
        return newOrder;
      } finally {
        isCreatingOrderRef.current = false;
      }
    },
    [applyCreatedAt, toast]
  );

  const updateOrder = useCallback(
    async (orderId: string, payload: UpdateOrderPayload) => {
      const updated = await apiService.updateOrder(orderId, payload);
      const orderWithCreatedAt = applyCreatedAt(updated);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? orderWithCreatedAt : o))
      );
      toast.addToast(`Orden #${updated.externalId} actualizada`, 'success');
      return updated;
    },
    [applyCreatedAt, toast]
  );

  const contextValue = useMemo<OrdersContextProps>(
    () => ({
      orders,
      isLoading,
      isPending,
      isConnected,
      error: error || socketError,
      updateStatus,
      createOrder,
      updateOrder,
      lastSimulationStop,
    }),
    [orders, isLoading, isPending, isConnected, error, socketError, updateStatus, createOrder, updateOrder, lastSimulationStop]
  );

  return (
    <OrdersContext.Provider value={contextValue}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders(): OrdersContextProps {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
}
