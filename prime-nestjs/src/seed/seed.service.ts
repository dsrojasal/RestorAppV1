import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from 'src/rol/entities/rol.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Rol) private readonly rolRepo: Repository<Rol>,
    @InjectRepository(TipoPago) private readonly tipoPagoRepo: Repository<TipoPago>,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
    await this.seedTipoPago();
  }

  private async seedRoles() {
    const count = await this.rolRepo.count();
    if (count > 0) return;

    await this.rolRepo.save([
      { nombre: 'Administrador', descripcion: 'Acceso total al sistema' },
      { nombre: 'Mesero', descripcion: 'Gestión de pedidos y mesas' },
      { nombre: 'Chef', descripcion: 'Visualización y cambio de estado de pedidos' },
      { nombre: 'Cajero', descripcion: 'Procesamiento de pagos y facturas' },
    ]);
  }

  private async seedTipoPago() {
    const count = await this.tipoPagoRepo.count();
    if (count > 0) return;

    await this.tipoPagoRepo.save([{ nombre: 'Efectivo' }, { nombre: 'Tarjeta débito' }, { nombre: 'Tarjeta crédito' }, { nombre: 'Transferencia' }]);
  }
}
