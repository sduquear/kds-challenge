import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Order } from '@kds/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const isDev = process.env.NODE_ENV === 'development';

export type OrdersSocketCallbacks = {
  onOrderCreated?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onOrderLimitReached?: () => void;
};

export type UseOrdersSocketReturn = {
  isConnected: boolean;
  error: string | null;
};

export function useOrdersSocket(callbacks: OrdersSocketCallbacks): UseOrdersSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const socket = io(`${SOCKET_URL}/orders`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (isDev) console.log('[WS] Connected to orders namespace');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      if (isDev) console.log('[WS] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      if (isDev) console.error('[WS] Connection error:', err.message);
      setError(`Connection error: ${err.message}`);
      setIsConnected(false);
    });

    socket.on('order_created', (order: Order) => {
      if (isDev) console.log('[WS] Order created:', order.externalId);
      callbacksRef.current.onOrderCreated?.(order);
    });

    socket.on('order_updated', (order: Order) => {
      if (isDev) console.log('[WS] Order updated:', order.externalId, '->', order.status);
      callbacksRef.current.onOrderUpdated?.(order);
    });

    socket.on('order_limit_reached', () => {
      if (isDev) console.log('[WS] Order limit reached');
      callbacksRef.current.onOrderLimitReached?.();
    });

    return () => {
      if (isDev) console.log('[WS] Cleaning up socket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { isConnected, error };
}
