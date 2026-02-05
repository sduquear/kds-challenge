import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export const MANUAL_ORDER_SEQUENCE_ID = 'manual_order';

@Schema({ _id: true })
export class Counter {
  _id: string;
  @Prop({ required: true, default: 0 })
  value: number;
}

export type CounterDocument = HydratedDocument<Counter>;

export const CounterSchema: MongooseSchema<CounterDocument> =
  new MongooseSchema<CounterDocument>(
    {
      _id: { type: String, required: true },
      value: { type: Number, required: true, default: 0 },
    },
    { _id: true },
  );
