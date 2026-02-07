import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@kds/shared';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepo: {
    findAll: jest.Mock;
    findById: jest.Mock;
    getNextManualSequence: jest.Mock;
    countTotal: jest.Mock;
    create: jest.Mock;
    updateById: jest.Mock;
    setRiderArrivedAt: jest.Mock;
    deleteById: jest.Mock;
  };
  let ordersGateway: {
    notifyNewOrder: jest.Mock;
    notifyOrderUpdated: jest.Mock;
  };

  const mockOrderId = '507f1f77bcf86cd799439011';
  const mockOrder = {
    _id: mockOrderId,
    externalId: 'GLO-123',
    status: OrderStatus.PENDING,
    customerName: 'Cliente Test',
    items: [
      {
        id: '1',
        name: 'Hamburguesa',
        quantity: 1,
        price: { amount: 1000, currency: 'EUR' },
      },
    ],
    total: { amount: 1000, currency: 'EUR' },
    riderArrivedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const savedOrderForCreate = { ...mockOrder, _id: mockOrderId };

  beforeEach(async () => {
    ordersRepo = {
      findAll: jest.fn().mockResolvedValue([mockOrder]),
      findById: jest.fn().mockResolvedValue(mockOrder),
      getNextManualSequence: jest.fn().mockResolvedValue(1),
      countTotal: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockImplementation((payload: Record<string, unknown>) =>
        Promise.resolve({
          ...payload,
          _id: mockOrderId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      updateById: jest.fn().mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.IN_PROGRESS,
      }),
      setRiderArrivedAt: jest.fn().mockResolvedValue({
        ...mockOrder,
        riderArrivedAt: new Date(),
      }),
      deleteById: jest.fn().mockResolvedValue(mockOrder),
    };

    ordersGateway = {
      notifyNewOrder: jest.fn(),
      notifyOrderUpdated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: ordersRepo },
        { provide: OrdersGateway, useValue: ordersGateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of orders', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockOrder]);
      expect(ordersRepo.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const result = await service.findOne('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      ordersRepo.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Order #nonexistent not found',
      );
    });
  });

  describe('create', () => {
    it('should create an order and notify gateway', async () => {
      const createDto: CreateOrderDto = {
        customerName: 'Cliente Test',
        items: [
          {
            id: '1',
            name: 'Hamburguesa',
            quantity: 2,
            price: { amount: 500, currency: 'EUR' },
          },
        ],
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.total).toEqual({ amount: 1000, currency: 'EUR' });
      expect(ordersGateway.notifyNewOrder).toHaveBeenCalledWith(
        expect.objectContaining({ total: { amount: 1000, currency: 'EUR' } }),
      );
    });

    it('should use provided externalId when given', async () => {
      const createDto: CreateOrderDto = {
        externalId: '  glo-999  ',
        customerName: 'Cliente',
        items: [
          {
            id: '1',
            name: 'Item',
            quantity: 1,
            price: { amount: 500, currency: 'EUR' },
          },
        ],
      };
      const result = await service.create(createDto);
      expect(result).toBeDefined();
      expect(result.externalId).toBe('GLO-999');
    });

    it('should use getNextManualSequence when externalId omitted', async () => {
      const createDto: CreateOrderDto = {
        customerName: 'Cliente',
        items: [
          {
            id: '1',
            name: 'Item',
            quantity: 1,
            price: { amount: 500, currency: 'EUR' },
          },
        ],
      };
      ordersRepo.getNextManualSequence.mockResolvedValue(2);
      const result = await service.create(createDto);
      expect(result).toBeDefined();
      expect(result.externalId).toBe('MAN-002');
      expect(ordersRepo.getNextManualSequence).toHaveBeenCalled();
    });

    it('should compute total from items and default currency', async () => {
      const createDto: CreateOrderDto = {
        customerName: 'Cliente',
        items: [
          {
            id: '1',
            name: 'A',
            quantity: 2,
            price: { amount: 100, currency: 'USD' },
          },
          {
            id: '2',
            name: 'B',
            quantity: 1,
            price: { amount: 50, currency: 'USD' },
          },
        ],
      };
      await service.create(createDto);
      expect(ordersGateway.notifyNewOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          total: { amount: 250, currency: 'USD' },
        }),
      );
    });

    it('should compute total 0 when items are empty', async () => {
      const createDto: CreateOrderDto = {
        customerName: 'Cliente',
        items: [],
      };
      await service.create(createDto);
      expect(ordersGateway.notifyNewOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          total: { amount: 0, currency: 'EUR' },
        }),
      );
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when order does not exist', async () => {
      ordersRepo.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { status: OrderStatus.IN_PROGRESS }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow valid transition PENDING -> IN_PROGRESS', async () => {
      const updated = { ...mockOrder, status: OrderStatus.IN_PROGRESS };
      ordersRepo.updateById.mockResolvedValue(updated);

      const result = await service.update('507f1f77bcf86cd799439011', {
        status: OrderStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(OrderStatus.IN_PROGRESS);
      expect(ordersGateway.notifyOrderUpdated).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid transition PENDING -> DELIVERED', async () => {
      await expect(
        service.update('507f1f77bcf86cd799439011', {
          status: OrderStatus.DELIVERED,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('507f1f77bcf86cd799439011', {
          status: OrderStatus.DELIVERED,
        }),
      ).rejects.toThrow(/Invalid state transition/);
    });

    it('should throw BadRequestException for READY -> DELIVERED when rider has not arrived', async () => {
      const readyOrder = {
        ...mockOrder,
        status: OrderStatus.READY,
        riderArrivedAt: undefined,
      };
      ordersRepo.findById.mockResolvedValue(readyOrder);

      await expect(
        service.update('507f1f77bcf86cd799439011', {
          status: OrderStatus.DELIVERED,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('507f1f77bcf86cd799439011', {
          status: OrderStatus.DELIVERED,
        }),
      ).rejects.toThrow(/Rider has not arrived/);
    });

    it('should allow READY -> DELIVERED when rider has arrived', async () => {
      const readyOrder = {
        ...mockOrder,
        status: OrderStatus.READY,
        riderArrivedAt: new Date(),
      };
      const deliveredOrder = { ...readyOrder, status: OrderStatus.DELIVERED };
      ordersRepo.findById.mockResolvedValue(readyOrder);
      ordersRepo.updateById.mockResolvedValue(deliveredOrder);

      const result = await service.update('507f1f77bcf86cd799439011', {
        status: OrderStatus.DELIVERED,
      });
      expect(result.status).toBe(OrderStatus.DELIVERED);
      expect(ordersGateway.notifyOrderUpdated).toHaveBeenCalledWith(
        deliveredOrder,
      );
    });

    it('should recalculate total when items are updated', async () => {
      const updatedWithItems = {
        ...mockOrder,
        items: [
          {
            id: '1',
            name: 'New',
            quantity: 3,
            price: { amount: 200, currency: 'EUR' },
          },
        ],
        total: { amount: 600, currency: 'EUR' },
      };
      ordersRepo.updateById.mockResolvedValue(updatedWithItems);

      const result = await service.update('507f1f77bcf86cd799439011', {
        items: [
          {
            id: '1',
            name: 'New',
            quantity: 3,
            price: { amount: 200, currency: 'EUR' },
          },
        ],
      });
      expect(result.total).toEqual({ amount: 600, currency: 'EUR' });
    });
  });

  describe('remove', () => {
    it('should delete and return the order', async () => {
      const result = await service.remove('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockOrder);
      expect(ordersRepo.deleteById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('should clear scheduled rider arrival when order had one', async () => {
      const createDto: CreateOrderDto = {
        customerName: 'Cliente',
        items: [
          {
            id: '1',
            name: 'Item',
            quantity: 1,
            price: { amount: 100, currency: 'EUR' },
          },
        ],
      };
      await service.create(createDto);
      ordersRepo.deleteById.mockResolvedValue(savedOrderForCreate);
      const result = await service.remove(mockOrderId);
      expect(result).toEqual(savedOrderForCreate);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      ordersRepo.deleteById.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('scheduleRiderArrival callback', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should mark rider arrived and notify when timer fires', async () => {
      const orderNotDelivered = { ...mockOrder, status: OrderStatus.READY };
      const updatedWithRider = {
        ...orderNotDelivered,
        riderArrivedAt: new Date(),
      };
      ordersRepo.findById.mockResolvedValue(orderNotDelivered);
      ordersRepo.setRiderArrivedAt.mockResolvedValue(updatedWithRider);

      await service.create({
        customerName: 'Cliente',
        items: [
          {
            id: '1',
            name: 'Item',
            quantity: 1,
            price: { amount: 100, currency: 'EUR' },
          },
        ],
      });
      jest.advanceTimersByTime(30000);

      await Promise.resolve();
      await Promise.resolve();
      expect(ordersGateway.notifyOrderUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          riderArrivedAt: expect.any(Date) as unknown as Date,
        }),
      );
    });

    it('should use late arrival delay when random >= 0.7', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.8);
      const orderNotDelivered = { ...mockOrder, status: OrderStatus.READY };
      const updatedWithRider = {
        ...orderNotDelivered,
        riderArrivedAt: new Date(),
      };
      ordersRepo.findById.mockResolvedValue(orderNotDelivered);
      ordersRepo.setRiderArrivedAt.mockResolvedValue(updatedWithRider);

      await service.create({
        customerName: 'Cliente',
        items: [
          {
            id: '1',
            name: 'Item',
            quantity: 1,
            price: { amount: 100, currency: 'EUR' },
          },
        ],
      });
      jest.advanceTimersByTime(26000);
      await Promise.resolve();
      await Promise.resolve();
      expect(ordersGateway.notifyOrderUpdated).toHaveBeenCalled();
      (Math.random as jest.Mock).mockRestore();
    });

    it('should not update when order is already DELIVERED', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      ordersRepo.findById.mockResolvedValue(deliveredOrder);

      await service.create({
        customerName: 'Cliente',
        items: [
          {
            id: '1',
            name: 'Item',
            quantity: 1,
            price: { amount: 100, currency: 'EUR' },
          },
        ],
      });
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
      await Promise.resolve();

      expect(ordersRepo.setRiderArrivedAt).not.toHaveBeenCalled();
      expect(ordersGateway.notifyOrderUpdated).not.toHaveBeenCalled();
    });

    it('should handle findById error in rider callback', async () => {
      ordersRepo.findById.mockRejectedValue(new Error('DB error'));

      const logSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      await service.create({
        customerName: 'Cliente',
        items: [
          {
            id: '1',
            name: 'Item',
            quantity: 1,
            price: { amount: 100, currency: 'EUR' },
          },
        ],
      });
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
      await Promise.resolve();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to mark rider arrival'),
        expect.any(Error),
      );
      logSpy.mockRestore();
    });

    it('should clear previous rider timer when scheduling same order again', async () => {
      const orderNotDelivered = { ...mockOrder, status: OrderStatus.READY };
      const updatedWithRider = {
        ...orderNotDelivered,
        riderArrivedAt: new Date(),
      };
      ordersRepo.findById.mockResolvedValue(orderNotDelivered);
      ordersRepo.setRiderArrivedAt.mockResolvedValue(updatedWithRider);
      const serviceWithScheduler = service as unknown as {
        scheduleRiderArrival: (orderId: string) => void;
      };
      serviceWithScheduler.scheduleRiderArrival(mockOrderId);
      serviceWithScheduler.scheduleRiderArrival(mockOrderId);
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
      await Promise.resolve();
      expect(ordersGateway.notifyOrderUpdated).toHaveBeenCalledTimes(1);
    });
  });
});
