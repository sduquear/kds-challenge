import { Injectable, Logger } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '@kds/shared';
import { CreateOrderDto } from '../orders/dto/create-order.dto';

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private intervalRef: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private readonly ordersService: OrdersService) {}

  getStatus() {
    return { isRunning: this.isRunning };
  }

  private getRandomId(length = 5): string {
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }

  private getRandomNumericId(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  toggleSimulation() {
    if (this.isRunning) {
      this.stop();
      return { status: 'stopped' };
    } else {
      this.start();
      return { status: 'started' };
    }
  }

  private start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.log('🚀 Simulación KDS Iniciada');
    this.scheduleNextOrder();
  }

  private stop() {
    this.isRunning = false;
    if (this.intervalRef) clearTimeout(this.intervalRef);
    this.logger.log('🛑 Simulación KDS Detenida');
  }

  private scheduleNextOrder() {
    if (!this.isRunning) return;

    const randomDelay = Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);

    this.intervalRef = setTimeout(() => {
      void this.runScheduledOrder();
    }, randomDelay);
  }

  private async runScheduledOrder() {
    await this.createRandomOrder();
    this.scheduleNextOrder();
  }

  private async createRandomOrder() {
    try {
      const mockOrder = {
        externalId: `GLO-${this.getRandomNumericId(3)}`,
        customerName: `Cliente ${this.getRandomId(3)}`,
        status: OrderStatus.PENDING,
        items: [
          {
            id: '1',
            name: 'Hamburguesa KDS',
            quantity: 1,
            price: { amount: 1250, currency: 'EUR' },
          },
        ],
      };

      const savedOrder = await this.ordersService.create(
        mockOrder as CreateOrderDto,
      );

      this.logger.log(`New order created: ${savedOrder.externalId}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'ORDER_LIMIT_REACHED') {
         this.logger.warn('Order limit reached. Stopping simulation.');
         this.stop();
         this.ordersService.getGateway().notifyOrderLimitReached();
         return;
      }
      this.logger.error(
        `Error creating simulated order: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
