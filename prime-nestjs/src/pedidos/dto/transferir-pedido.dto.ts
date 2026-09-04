import { IsNotEmpty, IsNumber } from 'class-validator';

export class TransferirPedidoDto {
  @IsNotEmpty()
  @IsNumber()
  mesaId: number;
}
