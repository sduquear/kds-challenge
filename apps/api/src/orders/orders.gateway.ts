import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'orders',
})
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  notifyNewOrder(order: any) {
    this.server.emit('order_created', order);
  }

  notifyOrderUpdated(order: any) {
    this.server.emit('order_updated', order);
  }
}
