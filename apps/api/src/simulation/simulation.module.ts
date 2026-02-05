import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  controllers: [SimulationController],
  providers: [SimulationService],
  imports: [OrdersModule],
})
export class SimulationModule {}
