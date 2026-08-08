import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateIngredienteDto } from './create-ingrediente.dto';

export class UpdateIngredienteDto extends PartialType(OmitType(CreateIngredienteDto, ['stock'])) {}
