import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('resumen')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  resumen() {
    return this.service.resumen();
  }
}
