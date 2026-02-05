import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class OrderIdParamDto {
  @ApiProperty({ description: 'MongoDB ObjectId of the order' })
  @IsMongoId({ message: 'id must be a valid MongoDB ObjectId' })
  id: string;
}
