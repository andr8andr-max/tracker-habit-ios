import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/user.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: User }>();
    const header = request.headers['authorization'];
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Требуется авторизация');
    }

    let payload: { sub?: string } | undefined;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      if (isPublic) return true;
      throw new UnauthorizedException('Недействительный токен');
    }

    const user = payload?.sub ? await this.usersService.findById(payload.sub) : undefined;
    if (!user) {
      if (isPublic) return true;
      throw new UnauthorizedException('Пользователь не найден');
    }

    request.user = user;
    return true;
  }
}
