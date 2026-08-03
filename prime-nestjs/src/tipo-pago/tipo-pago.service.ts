import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoPago } from './entities/tipo-pago.entity';

@Injectable()
export class TipoPagoService {
  constructor(@InjectRepository(TipoPago) private readonly repo: Repository<TipoPago>) {}

  create(nombre: string): Promise<TipoPago> {
    return this.repo.save({ nombre });
  }

  findAll(): Promise<TipoPago[]> {
    return this.repo.find();
  }

  findOne(id: number): Promise<TipoPago | null> {
    return this.repo.findOneBy({ id });
  }
}
