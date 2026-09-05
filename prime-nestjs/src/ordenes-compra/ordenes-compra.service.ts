import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdenCompra, OCEstado } from './entities/orden-compra.entity';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { TipoNotificacion } from 'src/notificaciones/entities/notificacion.entity';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class OrdenesCompraService {
  constructor(
    @InjectRepository(OrdenCompra) private readonly repo: Repository<OrdenCompra>,
    private readonly notificaciones?: NotificacionesService,
  ) {}

  async create(dto: CreateOrdenCompraDto): Promise<OrdenCompra> {
    const oc = await this.repo.save(this.repo.create(dto));
    if (oc.estado === OCEstado.ENVIADA) {
      this.notificarPendiente(oc);
    }
    return oc;
  }

  async findAll(): Promise<OrdenCompra[]> {
    return this.repo.find({ relations: ['proveedor'] });
  }

  findOne(id: number): Promise<OrdenCompra | null> {
    return this.repo.findOne({ where: { id }, relations: ['proveedor'] });
  }

  async update(id: number, dto: UpdateOrdenCompraDto): Promise<OrdenCompra> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`OrdenCompra #${id} no encontrada`);
    const pasoAEnviada = entity.estado !== OCEstado.ENVIADA && dto.estado === OCEstado.ENVIADA;
    Object.assign(entity, dto);
    const saved = await this.repo.save(entity);
    if (pasoAEnviada) {
      this.notificarPendiente(saved);
    }
    return saved;
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  private notificarPendiente(oc: OrdenCompra): void {
    this.notificaciones?.crear({
      tipo: TipoNotificacion.PROVEEDOR,
      mensaje: 'Proveedor: Pedido de insumos pendiente',
      icono: 'local_shipping',
      clase: 'warning',
      roles: [Role.ADMIN, Role.CHEF],
      refId: `oc:${oc.id}`,
    });
  }
}
