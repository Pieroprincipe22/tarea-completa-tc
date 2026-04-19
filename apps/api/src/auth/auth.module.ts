import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

type JwtExpiresUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y';
type JwtExpiresValue = number | `${number}` | `${number}${JwtExpiresUnit}`;

function resolveJwtExpiresIn(): JwtExpiresValue {
  const raw = process.env.JWT_ACCESS_EXPIRES_IN?.trim();

  if (!raw) {
    return '12h';
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  if (/^\d+(ms|s|m|h|d|w|y)$/.test(raw)) {
    return raw as `${number}${JwtExpiresUnit}`;
  }

  return '12h';
}

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'tc-local-dev-secret-change-me',
      signOptions: {
        expiresIn: resolveJwtExpiresIn(),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}