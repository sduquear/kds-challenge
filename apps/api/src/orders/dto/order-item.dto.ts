import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderPriceDto {
  @ApiProperty({ example: 1250, description: 'Price in cents' })
  @IsNumber({}, { message: 'must be a number (cents)' })
  @Min(0, { message: 'must be 0 or greater' })
  amount: number;

  @ApiProperty({ example: 'EUR' })
  @IsString({ message: 'must be a string' })
  @IsNotEmpty({ message: 'is required' })
  currency: string;
}

export class OrderItemDto {
  @ApiProperty({ example: '1' })
  @IsString({ message: 'must be a string' })
  @IsNotEmpty({ message: 'is required' })
  id: string;

  @ApiProperty({ example: 'Hamburguesa KDS' })
  @IsString({ message: 'must be a string' })
  @IsNotEmpty({ message: 'is required' })
  name: string;

  @ApiProperty({ example: 'https://img.com/burger.png', required: false })
  @IsString({ message: 'must be a string' })
  @IsOptional()
  image?: string;

  @ApiProperty({ type: OrderPriceDto })
  @ValidateNested()
  @Type(() => OrderPriceDto)
  price: OrderPriceDto;

  @ApiProperty({ example: 1 })
  @IsNumber({}, { message: 'must be a number' })
  @Min(1, { message: 'must be at least 1' })
  quantity: number;
}
