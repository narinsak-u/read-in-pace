import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: { username: string }) {
    return this.authService.login(body.username);
  }

  @Post('logout')
  logout() {
    return this.authService.logout();
  }

  @Get('me')
  getProfile() {
    return this.authService.getProfile();
  }
}
