import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly mockUser = {
    username: 'Alex Rivera',
    email: 'alex@readinpace.com',
  };

  login(username: string) {
    return {
      token: 'mock-jwt-token',
      user: this.mockUser,
    };
  }

  logout() {
    return { success: true };
  }

  getProfile() {
    return this.mockUser;
  }
}
