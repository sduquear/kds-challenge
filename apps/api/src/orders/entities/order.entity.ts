import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Order as IOrder, OrderStatus, Item as IItem } from '@kds/shared';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

@Schema({
  timestamps: true,
  toJSON: {
    transform(_doc, ret: Record<string, unknown>) {
      delete ret.__v;
      return ret;
    },
  },
})
export class Order implements IOrder {
  @ApiProperty({ description: 'Internal ID of the order' })
  _id: string;

  @ApiProperty({ description: 'External ID of the order' })
  @Prop({ required: true, unique: true })
  externalId: string;

  @ApiProperty({ enum: OrderStatus })
  @Prop({ type: String, enum: OrderStatus, required: true })
  status: OrderStatus;

  @ApiProperty({ description: 'List of items in the order' })
  @Prop({ required: true })
  items: IItem[];

  @ApiProperty({ description: 'Name of the customer who placed the order' })
  @Prop({ required: true })
  customerName: string;

  @ApiProperty({
    description:
      'Order total (amount in cents). Sum of (item.price.amount * item.quantity) for all items.',
  })
  @Prop({ type: { amount: Number, currency: String }, required: false })
  total?: { amount: number; currency: string };

  @ApiProperty({
    description: 'Timestamp when rider arrived at the restaurant',
  })
  @Prop({ required: false })
  riderArrivedAt?: Date;

  @ApiProperty({ description: 'Date and time the order was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Date and time the order was updated' })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ createdAt: -1 });
