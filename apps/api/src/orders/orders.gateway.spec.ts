import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { OrdersGateway } from './orders.gateway';

describe('OrdersGateway', () => {
  let gateway: OrdersGateway;

  const mockEmit = jest.fn();
  const mockServer: Pick<Server, 'emit'> = {
    emit: mockEmit as Server['emit'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersGateway],
    }).compile();

    gateway = module.get<OrdersGateway>(OrdersGateway);
    gateway.server = mockServer as Server;
    mockEmit.mockClear();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('notifyNewOrder', () => {
    it('should emit order_created with the order', () => {
      const order = { _id: '1', externalId: 'GLO-001', status: 'PENDING' };
      gateway.notifyNewOrder(order);
      expect(mockServer.emit).toHaveBeenCalledWith('order_created', order);
    });
  });

  describe('notifyOrderUpdated', () => {
    it('should emit order_updated with the order', () => {
      const order = { _id: '1', externalId: 'GLO-001', status: 'READY' };
      gateway.notifyOrderUpdated(order);
      expect(mockServer.emit).toHaveBeenCalledWith('order_updated', order);
    });
  });
});
