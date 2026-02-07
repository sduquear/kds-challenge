import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { OrderStatus } from '@kds/shared';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderIdParamDto } from './dto/order-id-param.dto';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { Order } from './entities/order.entity';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiResponse({
    status: 201,
    description: 'The order has been successfully created.',
    type: Order,
  })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: 'The list of orders.',
    type: [Order],
  })
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.ordersService.findAll(status, limit, offset);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'The order has been successfully found.',
    type: Order,
  })
  findOne(@Param() params: OrderIdParamDto) {
    return this.ordersService.findOne(params.id);
  }

  @Patch(':id')
  @ApiResponse({
    status: 200,
    description: 'The order has been successfully updated.',
    type: Order,
  })
  update(
    @Param() params: OrderIdParamDto,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(params.id, updateOrderDto);
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'The order has been successfully deleted.',
    type: Order,
  })
  remove(@Param() params: OrderIdParamDto) {
    return this.ordersService.remove(params.id);
  }
}
