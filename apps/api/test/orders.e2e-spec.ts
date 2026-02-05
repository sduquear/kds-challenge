import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import request from 'supertest';
import { OrdersController } from '../src/orders/orders.controller';
import { OrdersService } from '../src/orders/orders.service';
import { validationExceptionFactory } from '../src/common/validation-error.util';

const ORDER_ID = '507f1f77bcf86cd799439011';

const orderPayload = {
  customerName: 'María García',
  items: [
    {
      id: '1',
      name: 'Hamburguesa clásica',
      price: { amount: 1250, currency: 'EUR' },
      quantity: 2,
    },
  ],
};

const sampleOrder = {
  _id: ORDER_ID,
  externalId: 'MAN-001',
  customerName: orderPayload.customerName,
  items: orderPayload.items,
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  const mockOrdersService = {
    findAll: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /orders', () => {
    it('devuelve lista vacía de órdenes', () => {
      return request(app.getHttpServer())
        .get('/orders')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(0);
        });
    });
  });

  describe('POST /orders', () => {
    it('crea una orden con body válido y devuelve 201', () => {
      mockOrdersService.create.mockResolvedValueOnce(sampleOrder);

      return request(app.getHttpServer())
        .post('/orders')
        .send(orderPayload)
        .expect(201)
        .expect((res) => {
          expect(res.body).toMatchObject({
            customerName: orderPayload.customerName,
            items: orderPayload.items,
            status: 'PENDING',
          });
          expect(res.body._id).toBeDefined();
        });
    });

    it('devuelve 400 con mensaje específico cuando faltan campos requeridos', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({ customerName: 'Solo nombre' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
          expect(res.body.message).toContain('Validation failed');
          expect(res.body.errors).toBeDefined();
          expect(Array.isArray(res.body.errors)).toBe(true);
          const fieldMessages = res.body.errors as Array<{
            field: string;
            message: string;
          }>;
          expect(fieldMessages.some((e) => e.field === 'items')).toBe(true);
          expect(
            fieldMessages.some(
              (e) =>
                e.message.toLowerCase().includes('array') ||
                e.message.toLowerCase().includes('required'),
            ),
          ).toBe(true);
        });
    });

    it('devuelve 400 cuando customerName es un objeto en lugar de string', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: { '2': '2' },
          items: [
            {
              id: '1',
              name: 'Hamburguesa KDS',
              price: { amount: 1250, currency: 'EUR' },
              quantity: 2,
            },
          ],
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Validation failed');
          const fieldMessages = res.body.errors as Array<{
            field: string;
            message: string;
          }>;
          const customerNameError = fieldMessages.find(
            (e) => e.field === 'customerName',
          );
          expect(customerNameError).toBeDefined();
          expect(customerNameError!.message.toLowerCase()).toMatch(
            /string|required/,
          );
        });
    });

    it('devuelve 409 con mensaje claro cuando externalId ya existe', () => {
      mockOrdersService.create.mockRejectedValueOnce(
        new ConflictException(
          "An order with externalId 'GLO-999' already exists. externalId must be unique.",
        ),
      );

      return request(app.getHttpServer())
        .post('/orders')
        .send({ ...orderPayload, externalId: 'GLO-999' })
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('already exists');
          expect(res.body.message).toContain('GLO-999');
          expect(res.body.message).toContain('unique');
        });
    });
  });

  describe('GET /orders/:id', () => {
    it('devuelve la orden cuando existe', () => {
      mockOrdersService.findOne.mockResolvedValueOnce(sampleOrder);

      return request(app.getHttpServer())
        .get(`/orders/${ORDER_ID}`)
        .expect(200)
        .expect((res) => {
          expect(res.body._id).toBe(ORDER_ID);
          expect(res.body.customerName).toBe(sampleOrder.customerName);
          expect(res.body.status).toBe('PENDING');
        });
    });

    it('devuelve 404 cuando la orden no existe', () => {
      mockOrdersService.findOne.mockRejectedValueOnce(
        new NotFoundException(`Order #${ORDER_ID} not found`),
      );

      return request(app.getHttpServer())
        .get(`/orders/${ORDER_ID}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });
  });

  describe('PATCH /orders/:id', () => {
    it('actualiza la orden con body válido y devuelve 200', () => {
      const updated = {
        ...sampleOrder,
        status: 'IN_PROGRESS',
        updatedAt: new Date().toISOString(),
      };
      mockOrdersService.update.mockResolvedValueOnce(updated);

      return request(app.getHttpServer())
        .patch(`/orders/${ORDER_ID}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200)
        .expect((res) => {
          expect(res.body._id).toBe(ORDER_ID);
          expect(res.body.status).toBe('IN_PROGRESS');
        });
    });

    it('devuelve 400 con mensaje específico cuando el status no es válido', () => {
      return request(app.getHttpServer())
        .patch(`/orders/${ORDER_ID}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
          expect(res.body.message).toContain('Validation failed');
          expect(res.body.errors).toBeDefined();
          const statusError = (
            res.body.errors as Array<{ field: string; message: string }>
          ).find((e) => e.field === 'status');
          expect(statusError).toBeDefined();
          expect(statusError!.message).toMatch(
            /PENDING|IN_PROGRESS|READY|DELIVERED/,
          );
        });
    });

    it('devuelve 404 cuando la orden no existe', () => {
      mockOrdersService.update.mockRejectedValueOnce(
        new NotFoundException(`Order #${ORDER_ID} not found`),
      );

      return request(app.getHttpServer())
        .patch(`/orders/${ORDER_ID}`)
        .send({ status: 'PENDING' })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });
  });

  describe('DELETE /orders/:id', () => {
    it('elimina la orden y devuelve 200', () => {
      mockOrdersService.remove.mockResolvedValueOnce(sampleOrder);

      return request(app.getHttpServer())
        .delete(`/orders/${ORDER_ID}`)
        .expect(200)
        .expect((res) => {
          expect(res.body._id).toBe(ORDER_ID);
        });
    });

    it('devuelve 404 cuando la orden no existe', () => {
      mockOrdersService.remove.mockRejectedValueOnce(
        new NotFoundException(`Order #${ORDER_ID} not found`),
      );

      return request(app.getHttpServer())
        .delete(`/orders/${ORDER_ID}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });
  });
});
