import { OrderStatus } from '../enums/order-status.enum';
import { Item } from './item.interface';

export interface Order {
  _id?: string;        // ID interno de Mongo (opcional al crear)
  externalId: string;  // Formato: 3 letras + 3 números (ej. GLO-123, MAN-123)
  status: OrderStatus;
  items: Item[];
  customerName: string;
  /** Order total (amount in cents). Sum of (item.price.amount * item.quantity) for all items. */
  total?: { amount: number; currency: string };
  riderArrivedAt?: Date; // Timestamp when rider arrived (null if not yet)
  createdAt?: Date;    // Opcional porque al enviar desde el front no existe aún
  updatedAt?: Date;
}