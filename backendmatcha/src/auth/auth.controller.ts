import { Controller, Post, Body, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  // Endpoint untuk validasi token dari frontend/middleware
  @Get('verify')
  verify(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token tidak ada');
    }
    const token = authHeader.slice(7);
    const result = this.authService.verifyToken(token);
    if (!result.valid) {
      throw new UnauthorizedException(result.reason || 'Token tidak valid');
    }
    return result.payload;
  }
}