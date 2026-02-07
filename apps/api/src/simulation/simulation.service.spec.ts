import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { OrdersService } from '../orders/orders.service';
import { ORDER_LIMIT_REACHED_CODE } from '@kds/shared';

describe('SimulationService', () => {
  let service: SimulationService;
  let ordersService: { create: jest.Mock };

  beforeEach(async () => {
    ordersService = {
      create: jest.fn().mockResolvedValue({ _id: '1', externalId: 'GLO-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        {
          provide: OrdersService,
          useValue: ordersService,
        },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return isRunning false initially', () => {
      const result = service.getStatus();
      expect(result).toEqual({ isRunning: false });
    });

    it('should return isRunning true after start', () => {
      service.toggleSimulation();
      expect(service.getStatus()).toEqual({ isRunning: true });
    });
  });

  describe('toggleSimulation', () => {
    it('should return status started when toggling from stopped', () => {
      const result = service.toggleSimulation();
      expect(result).toEqual({ status: 'started' });
    });

    it('should return status stopped when toggling from running', () => {
      service.toggleSimulation();
      const result = service.toggleSimulation();
      expect(result).toEqual({ status: 'stopped' });
    });
  });

  describe('start/stop guards', () => {
    const servicePrivate = () =>
      service as unknown as {
        start: () => void;
        scheduleNextOrder: () => void;
      };

    it('should not start twice when start is called while already running', () => {
      service.toggleSimulation();
      servicePrivate().start();
      expect(service.getStatus().isRunning).toBe(true);
    });

    it('should no-op when scheduleNextOrder is called while not running', () => {
      servicePrivate().scheduleNextOrder();
      expect(ordersService.create).not.toHaveBeenCalled();
    });
  });

  describe('scheduled order creation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a random order when timer fires', async () => {
      service.toggleSimulation();
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
      await Promise.resolve();

      expect(ordersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          externalId: expect.stringMatching(/^GLO-\d{3}$/) as unknown as string,
          customerName: expect.stringMatching(
            /^Cliente [A-Z0-9]{3}$/,
          ) as unknown as string,
          status: 'PENDING',
          items: expect.any(Array) as unknown as unknown[],
        }),
      );
    });

    it('should log error when create fails', async () => {
      ordersService.create.mockRejectedValueOnce(new Error('DB error'));
      const logSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      service.toggleSimulation();
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
      await Promise.resolve();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error creating simulated order'),
      );
      logSpy.mockRestore();
    });

    it('should stop simulation and notify gateway when ORDER_LIMIT_REACHED_CODE error occurs', async () => {
      ordersService.create.mockRejectedValueOnce(
        new Error(ORDER_LIMIT_REACHED_CODE),
      );
      const gatewayMock = { notifyOrderLimitReached: jest.fn() };
      const getGatewayMock = jest.fn().mockReturnValue(gatewayMock);
      (ordersService as any).getGateway = getGatewayMock;

      const stopSpy = jest.spyOn(service, 'stop' as any);
      const logSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

      service.toggleSimulation(); // Start running state
      await (service as any).runScheduledOrder();

      expect(stopSpy).toHaveBeenCalled();
      expect(gatewayMock.notifyOrderLimitReached).toHaveBeenCalled();
      expect(service.getStatus().isRunning).toBe(false);

      logSpy.mockRestore();
      stopSpy.mockRestore();
    });
  });
});
