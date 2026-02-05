import type { Order, OrderStatus } from '@kds/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type CreateOrderPayload = {
  externalId?: string;
  customerName: string;
  items: Array<{
    id: string;
    name: string;
    image?: string;
    price: { amount: number; currency: string };
    quantity: number;
  }>;
  status?: OrderStatus;
};

export type UpdateOrderPayload = Partial<CreateOrderPayload>;

export const apiService = {
  async getOrders(): Promise<Order[]> {
    const response = await fetch(`${API_URL}/orders`);

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }

    return response.json();
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Failed to update order: ${response.statusText}`);
    }

    return response.json();
  },

  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Failed to create order: ${response.statusText}`);
    }

    return response.json();
  },

  async getOrder(orderId: string): Promise<Order> {
    const response = await fetch(`${API_URL}/orders/${orderId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch order: ${response.statusText}`);
    }

    return response.json();
  },

  async updateOrder(orderId: string, payload: UpdateOrderPayload): Promise<Order> {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Failed to update order: ${response.statusText}`);
    }

    return response.json();
  },

  async getSimulationStatus(): Promise<{ isRunning: boolean }> {
    const response = await fetch(`${API_URL}/simulation/status`);

    if (!response.ok) {
      throw new Error(`Failed to fetch simulation status: ${response.statusText}`);
    }

    return response.json();
  },

  async toggleSimulation(): Promise<{ status: 'started' | 'stopped' }> {
    const response = await fetch(`${API_URL}/simulation/toggle`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle simulation: ${response.statusText}`);
    }

    return response.json();
  },
};
