import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { Public } from '../common/public.decorator';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './password.util';

const ACCESS_COOKIE = 'tc_access';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value : ''))
  @IsString()
  @MinLength(1)
  password!: string;
}

class ForgotPasswordDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Escribe un email válido.' })
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{20,200}$/, {
    message: 'El enlace no es válido o ha caducado. Pide uno nuevo.',
  })
  token!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  password!: string;
}

const strictValidation = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  // Límite estricto contra fuerza bruta: 5 intentos por minuto por IP.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(body.email, body.password);

    res.cookie(ACCESS_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TWELVE_HOURS_MS,
      path: '/',
    });

    return result;
  }

  // Responde siempre lo mismo, exista o no la cuenta.
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body(strictValidation) body: ForgotPasswordDto) {
    await this.passwordReset.requestReset(body.email);
    return { ok: true };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(strictValidation) body: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.passwordReset.resetPassword(body.token, body.password);
    // Cierra la sesión de este navegador por si había una abierta.
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    return { ok: true };
  }
}