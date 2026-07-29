import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoIngredienteDto } from './create-producto-ingrediente.dto';

export class UpdateProductoIngredienteDto extends PartialType(CreateProductoIngredienteDto) {}
