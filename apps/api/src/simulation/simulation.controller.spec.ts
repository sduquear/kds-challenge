import { Test, TestingModule } from '@nestjs/testing';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';

describe('SimulationController', () => {
  let controller: SimulationController;
  let simulationService: {
    getStatus: jest.Mock;
    toggleSimulation: jest.Mock;
  };

  beforeEach(async () => {
    simulationService = {
      getStatus: jest.fn().mockReturnValue({ isRunning: false }),
      toggleSimulation: jest.fn().mockReturnValue({ status: 'started' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SimulationController],
      providers: [
        {
          provide: SimulationService,
          useValue: simulationService,
        },
      ],
    }).compile();

    controller = module.get<SimulationController>(SimulationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return simulation status', () => {
      const result = controller.getStatus();
      expect(result).toEqual({ isRunning: false });
      expect(simulationService.getStatus).toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('should call toggleSimulation and return its result', () => {
      const result = controller.toggle();
      expect(result).toEqual({ status: 'started' });
      expect(simulationService.toggleSimulation).toHaveBeenCalled();
    });
  });
});
