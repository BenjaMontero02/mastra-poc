import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('validate')
  async validate(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new HttpException(
        { valid: false, error: 'No token provided' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token || token === authHeader) {
      throw new HttpException(
        { valid: false, error: 'No token provided' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result = await this.authService.validateOrCreateUser(token);

    if (!result.valid) {
      throw new HttpException(result, HttpStatus.UNAUTHORIZED);
    }

    return result;
  }
}
