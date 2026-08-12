import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { CreateUsuarioDto } from 'src/usuarios/dto/create-usuario.dto';
import { Public, Roles } from 'src/custom.decorator';
import { RolesGuard } from './strategy/roles.guard';
import { Role } from 'src/common/enums/role.enum';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDTO) {
    return this.authService.login(loginDto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('register')
  async register(@Body() registerDto: CreateUsuarioDto) {
    return this.authService.register(registerDto);
  }
}
