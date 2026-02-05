import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SimulationController } from '../src/simulation/simulation.controller';
import { SimulationService } from '../src/simulation/simulation.service';

describe('SimulationController (e2e)', () => {
  let app: INestApplication;
  const mockSimulationService = {
    getStatus: jest.fn().mockReturnValue({ isRunning: false }),
    toggleSimulation: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SimulationController],
      providers: [
        {
          provide: SimulationService,
          useValue: mockSimulationService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /simulation/status', () => {
    it('devuelve el estado de la simulación (parada)', () => {
      mockSimulationService.getStatus.mockReturnValueOnce({ isRunning: false });

      return request(app.getHttpServer())
        .get('/simulation/status')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ isRunning: false });
        });
    });

    it('devuelve el estado de la simulación (en marcha)', () => {
      mockSimulationService.getStatus.mockReturnValueOnce({ isRunning: true });

      return request(app.getHttpServer())
        .get('/simulation/status')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ isRunning: true });
        });
    });
  });

  describe('POST /simulation/toggle', () => {
    it('inicia la simulación y devuelve status started', () => {
      mockSimulationService.toggleSimulation.mockReturnValueOnce({
        status: 'started',
      });

      return request(app.getHttpServer())
        .post('/simulation/toggle')
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({ status: 'started' });
        });
    });

    it('detiene la simulación y devuelve status stopped', () => {
      mockSimulationService.toggleSimulation.mockReturnValueOnce({
        status: 'stopped',
      });

      return request(app.getHttpServer())
        .post('/simulation/toggle')
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({ status: 'stopped' });
        });
    });
  });
});
