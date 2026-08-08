import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EntradaStock } from './entities/entrada-stock.entity';
import { CreateEntradaStockDto } from './dto/create-entrada-stock.dto';
import { Producto, TipoProducto } from 'src/productos/entities/producto.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';

@Injectable()
export class EntradaStockService {
  constructor(
    @InjectRepository(EntradaStock) private readonly repo: Repository<EntradaStock>,
    private readonly dataSource: DataSource,
  ) {}

  async registrar(dto: CreateEntradaStockDto, usuarioId: number): Promise<EntradaStock> {
    const tieneProducto = dto.productoId != null;
    const tieneIngrediente = dto.ingredienteId != null;
    if (tieneProducto === tieneIngrediente) {
      throw new BadRequestException('Debe enviar productoId O ingredienteId, no ambos');
    }

    return this.dataSource.transaction(async (manager) => {
      let stockAntes: number;
      let stockDespues: number;
      let productoId: number | null = null;
      let ingredienteId: number | null = null;

      if (tieneProducto) {
        const producto = await manager.findOne(Producto, {
          where: { id: dto.productoId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!producto) throw new NotFoundException(`Producto #${dto.productoId} no encontrado`);
        if (producto.tipo === TipoProducto.PLATO) {
          throw new BadRequestException('Los platos se preparan y no manejan stock manual; controla su disponibilidad con receta');
        }
        stockAntes = Number(producto.stock) || 0;
        stockDespues = stockAntes + dto.cantidad;
        producto.stock = stockDespues;
        await manager.save(producto);
        productoId = producto.id;
      } else {
        const ingrediente = await manager.findOne(Ingrediente, {
          where: { id: dto.ingredienteId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!ingrediente) throw new NotFoundException(`Ingrediente #${dto.ingredienteId} no encontrado`);
        stockAntes = Number(ingrediente.stock) || 0;
        stockDespues = stockAntes + dto.cantidad;
        ingrediente.stock = stockDespues;
        await manager.save(ingrediente);
        ingredienteId = ingrediente.id;
      }

      const entrada = manager.create(EntradaStock, {
        productoId,
        ingredienteId,
        stockAntes,
        cantidad: dto.cantidad,
        stockDespues,
        usuarioId,
      });
      return manager.save(entrada);
    });
  }

  getHistorial(params: { productoId?: number; ingredienteId?: number; desde?: Date; hasta?: Date } = {}): Promise<EntradaStock[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.producto', 'producto')
      .leftJoinAndSelect('e.ingrediente', 'ingrediente')
      .leftJoinAndSelect('e.usuario', 'usuario')
      .orderBy('e.fecha', 'DESC');

    if (params.productoId != null) {
      qb.andWhere('e.productoId = :productoId', { productoId: params.productoId });
    }
    if (params.ingredienteId != null) {
      qb.andWhere('e.ingredienteId = :ingredienteId', { ingredienteId: params.ingredienteId });
    }
    if (params.desde) {
      qb.andWhere('e.fecha >= :desde', { desde: params.desde });
    }
    if (params.hasta) {
      qb.andWhere('e.fecha <= :hasta', { hasta: params.hasta });
    }

    return qb.getMany();
  }
}
