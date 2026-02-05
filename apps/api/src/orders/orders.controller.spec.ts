import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@kds/shared';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockOrder = {
    _id: '507f1f77bcf86cd799439011',
    externalId: 'GLO-123',
    status: OrderStatus.PENDING,
    customerName: 'Cliente Test',
    items: [],
    total: { amount: 1000, currency: 'EUR' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    ordersService = {
      create: jest.fn().mockResolvedValue(mockOrder),
      findAll: jest.fn().mockResolvedValue([mockOrder]),
      findOne: jest.fn().mockResolvedValue(mockOrder),
      update: jest
        .fn()
        .mockResolvedValue({ ...mockOrder, status: OrderStatus.IN_PROGRESS }),
      remove: jest.fn().mockResolvedValue(mockOrder),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: ordersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an order', async () => {
      const dto: CreateOrderDto = {
        customerName: 'Cliente',
        items: [
          {
            id: '1',
            name: 'Item',
            quantity: 1,
            price: { amount: 1000, currency: 'EUR' },
          },
        ],
      };
      const result = await controller.create(dto);
      expect(result).toEqual(mockOrder);
      expect(ordersService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of orders', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockOrder]);
      expect(ordersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return one order by id', async () => {
      const params = { id: '507f1f77bcf86cd799439011' };
      const result = await controller.findOne(params);
      expect(result).toEqual(mockOrder);
      expect(ordersService.findOne).toHaveBeenCalledWith(params.id);
    });
  });

  describe('update', () => {
    it('should update an order', async () => {
      const params = { id: '507f1f77bcf86cd799439011' };
      const dto: UpdateOrderDto = { status: OrderStatus.IN_PROGRESS };
      const result = await controller.update(params, dto);
      expect(result.status).toBe(OrderStatus.IN_PROGRESS);
      expect(ordersService.update).toHaveBeenCalledWith(params.id, dto);
    });
  });

  describe('remove', () => {
    it('should remove an order', async () => {
      const params = { id: '507f1f77bcf86cd799439011' };
      const result = await controller.remove(params);
      expect(result).toEqual(mockOrder);
      expect(ordersService.remove).toHaveBeenCalledWith(params.id);
    });
  });
});
