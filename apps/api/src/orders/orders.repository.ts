import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './entities/order.entity';
import {
  Counter,
  CounterDocument,
  MANUAL_ORDER_SEQUENCE_ID,
} from './entities/counter.entity';
import { isMongooseCastError } from '../common/types/mongo-error.types';
import type { Order as IOrder } from '@kds/shared';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Counter.name)
    private readonly counterModel: Model<CounterDocument>,
  ) {}

  async findAll(): Promise<IOrder[]> {
    return this.orderModel
      .find()
      .sort({ createdAt: -1 })
      .lean<IOrder[]>()
      .exec();
  }

  async findById(id: string): Promise<OrderDocument | null> {
    try {
      return await this.orderModel.findById(id).exec();
    } catch (err: unknown) {
      if (isMongooseCastError(err)) return null;
      throw err;
    }
  }

  async getNextManualSequence(): Promise<number> {
    const doc = await this.counterModel
      .findOneAndUpdate(
        { _id: MANUAL_ORDER_SEQUENCE_ID },
        { $inc: { value: 1 } },
        { upsert: true, new: true },
      )
      .exec();
    return doc.value;
  }

  async create(payload: Record<string, unknown>): Promise<OrderDocument> {
    const doc = new this.orderModel(payload);
    return doc.save();
  }

  async updateById(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<OrderDocument | null> {
    try {
      return await this.orderModel
        .findByIdAndUpdate(id, payload, {
          new: true,
          runValidators: true,
        })
        .exec();
    } catch (err: unknown) {
      if (isMongooseCastError(err)) return null;
      throw err;
    }
  }

  async setRiderArrivedAt(id: string): Promise<OrderDocument | null> {
    return this.updateById(id, { riderArrivedAt: new Date() });
  }

  async deleteById(id: string): Promise<OrderDocument | null> {
    try {
      return await this.orderModel.findByIdAndDelete(id).exec();
    } catch (err: unknown) {
      if (isMongooseCastError(err)) return null;
      throw err;
    }
  }
}
