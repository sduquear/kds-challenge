import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import type { Order as ApiOrder } from '@kds/shared';
import { OrderStatus, MAX_ORDERS } from '@kds/shared';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderDocument } from './entities/order.entity';
import { OrdersRepository } from './orders.repository';
import { OrdersGateway } from './orders.gateway';
import { isMongoDuplicateKeyError } from '../common/types/mongo-error.types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  private scheduledRiderArrivals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  getGateway() {
    return this.ordersGateway;
  }

  private readonly allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.IN_PROGRESS],
    [OrderStatus.IN_PROGRESS]: [OrderStatus.READY, OrderStatus.PENDING],
    [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.IN_PROGRESS],
    [OrderStatus.DELIVERED]: [OrderStatus.READY],
  };

  private validateStateTransition(
    currentOrder: OrderDocument,
    newStatus: OrderStatus,
  ): void {
    const currentStatus = currentOrder.status;
    const allowed = this.allowedTransitions[currentStatus];

    if (!allowed?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid state transition: ${currentStatus} → ${newStatus}. ` +
          `Allowed transitions from ${currentStatus}: [${allowed?.join(', ') || 'none'}]`,
      );
    }

    if (
      currentStatus === OrderStatus.READY &&
      newStatus === OrderStatus.DELIVERED
    ) {
      if (!currentOrder.riderArrivedAt) {
        throw new BadRequestException(
          'Cannot deliver order: Rider has not arrived yet. Wait for the rider.',
        );
      }
    }
  }

  private scheduleRiderArrival(orderId: string): void {
    if (this.scheduledRiderArrivals.has(orderId)) {
      clearTimeout(this.scheduledRiderArrivals.get(orderId));
    }

    const isEarlyArrival = Math.random() < 0.7;
    const delay = isEarlyArrival
      ? 3000 + Math.random() * 7000
      : 15000 + Math.random() * 10000;

    this.logger.log(
      `Rider arrival scheduled for order ${orderId} in ${Math.round(delay / 1000)}s (${isEarlyArrival ? 'early' : 'late'})`,
    );

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const order = await this.ordersRepo.findById(orderId);

          if (order && order.status !== OrderStatus.DELIVERED) {
            const updatedOrder =
              await this.ordersRepo.setRiderArrivedAt(orderId);

            if (updatedOrder) {
              this.logger.log(
                `Rider arrived for order ${orderId} (status: ${updatedOrder.status})`,
              );
              this.ordersGateway.notifyOrderUpdated(updatedOrder);
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to mark rider arrival for ${orderId}`,
            error,
          );
        } finally {
          this.scheduledRiderArrivals.delete(orderId);
        }
      })();
    }, delay);

    this.scheduledRiderArrivals.set(orderId, timeout);
  }

  private async getNextManualExternalId(): Promise<string> {
    const nextNum = await this.ordersRepo.getNextManualSequence();
    return `MAN-${String(nextNum).padStart(3, '0')}`;
  }

  private computeOrderTotal(items: CreateOrderDto['items']): {
    amount: number;
    currency: string;
  } {
    const defaultCurrency = 'EUR';
    if (!items?.length) {
      return { amount: 0, currency: defaultCurrency };
    }
    const amount = items.reduce(
      (sum, item) => sum + item.price.amount * item.quantity,
      0,
    );
    const currency = items[0]?.price?.currency ?? defaultCurrency;
    return { amount, currency };
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const raw = createOrderDto.externalId;
    const externalId = raw
      ? raw.trim().toUpperCase()
      : await this.getNextManualExternalId();
    const total = this.computeOrderTotal(createOrderDto.items);
    const payload = {
      ...createOrderDto,
      externalId,
      status: createOrderDto.status ?? OrderStatus.PENDING,
      total,
    };

    try {
      const activeCount = await this.ordersRepo.countTotal();
      if (activeCount >= MAX_ORDERS) {
        throw new ServiceUnavailableException(
          `Límite de ${MAX_ORDERS} órdenes alcanzado.`,
        );
      }

      const savedOrder = await this.ordersRepo.create(payload);

      this.ordersGateway.notifyNewOrder(savedOrder);
      this.scheduleRiderArrival(savedOrder._id.toString());

      return savedOrder;
    } catch (err: unknown) {
      if (isMongoDuplicateKeyError(err)) {
        const field = err.keyValue?.externalId ?? externalId;
        const fieldStr = typeof field === 'string' ? field : String(externalId);
        throw new ConflictException(
          `An order with externalId '${fieldStr}' already exists. externalId must be unique.`,
        );
      }
      throw err;
    }
  }

  async findAll(
    status?: OrderStatus,
    limit = MAX_ORDERS,
    offset = 0,
  ): Promise<ApiOrder[]> {
    const filter: Record<string, any> = {};

    if (status) {
      filter.status = status;
    }

    return this.ordersRepo.findAll(filter, limit, offset);
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepo.findById(id);
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const currentOrder = await this.ordersRepo.findById(id);
    if (!currentOrder) throw new NotFoundException(`Order #${id} not found`);

    if (
      updateOrderDto.status &&
      updateOrderDto.status !== currentOrder.status
    ) {
      this.validateStateTransition(currentOrder, updateOrderDto.status);
    }

    const payload = { ...updateOrderDto };
    if (payload.externalId != null) {
      (payload as Record<string, string>).externalId =
        payload.externalId.trim().toUpperCase();
    }
    if (updateOrderDto.items != null && updateOrderDto.items.length > 0) {
      (payload as Record<string, unknown>).total = this.computeOrderTotal(
        updateOrderDto.items,
      );
    }

    try {
      const updatedOrder = await this.ordersRepo.updateById(id, payload);
      if (!updatedOrder) throw new NotFoundException(`Order #${id} not found`);

      this.ordersGateway.notifyOrderUpdated(updatedOrder);
      this.logger.log(
        `Order ${id} updated: ${currentOrder.status} → ${updatedOrder.status}`,
      );
      return updatedOrder;
    } catch (err: unknown) {
      if (isMongoDuplicateKeyError(err)) {
        const field = err.keyValue?.externalId ?? updateOrderDto.externalId;
        const fieldStr =
          typeof field === 'string' ? field : String(updateOrderDto.externalId);
        throw new ConflictException(
          `An order with externalId '${fieldStr}' already exists. externalId must be unique.`,
        );
      }
      throw err;
    }
  }

  async remove(id: string): Promise<Order> {
    if (this.scheduledRiderArrivals.has(id)) {
      clearTimeout(this.scheduledRiderArrivals.get(id));
      this.scheduledRiderArrivals.delete(id);
    }

    const deletedOrder = await this.ordersRepo.deleteById(id);
    if (!deletedOrder) throw new NotFoundException(`Order #${id} not found`);
    return deletedOrder;
  }
}
