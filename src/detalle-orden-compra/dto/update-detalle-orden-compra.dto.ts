import { PartialType } from '@nestjs/mapped-types';
import { CreateDetalleOrdenCompraDto } from './create-detalle-orden-compra.dto';

export class UpdateDetalleOrdenCompraDto extends PartialType(CreateDetalleOrdenCompraDto) {}
