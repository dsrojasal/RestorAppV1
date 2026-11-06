import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginacionQueryDto } from 'src/common/dto/paginacion-query.dto';

export class PedidosQueryDto extends PaginacionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mesaId?: number;
}
