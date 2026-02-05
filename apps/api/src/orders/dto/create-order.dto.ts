import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@kds/shared';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

const EXTERNAL_ID_REGEX = /^[A-Za-z]{3}-\d{3}$/;

export class CreateOrderDto {
  @ApiProperty({
    example: 'GLO-123',
    description:
      'External ID: 3 letters, hyphen, 3 digits (e.g. GLO-123, MAN-123). If omitted, a sequential MAN-XXX id is generated.',
    required: false,
  })
  @IsString({ message: 'must be a string' })
  @Matches(EXTERNAL_ID_REGEX, {
    message: 'externalId must be 3 letters, hyphen, 3 digits (e.g. GLO-123)',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : undefined,
  )
  @IsOptional()
  externalId?: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString({ message: 'must be a string' })
  @IsNotEmpty({ message: 'is required' })
  customerName: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray({ message: 'must be an array of order items' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    required: false,
  })
  @IsEnum(OrderStatus, {
    message: 'must be one of: PENDING, IN_PROGRESS, READY, DELIVERED',
  })
  @IsOptional()
  status?: OrderStatus;
}
