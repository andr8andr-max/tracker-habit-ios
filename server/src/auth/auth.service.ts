import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Request } from 'express';
import { ClubsService } from '../clubs/clubs.service';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokensService } from './tokens.service';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  clubId: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly clubsService: ClubsService,
    private readonly tokensService: TokensService,
    private readonly jwtService: JwtService,
  ) {}

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      clubId: user.clubId,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  async resolveRequestUser(request: Request): Promise<User | null> {
    const header = request.headers['authorization'];
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(header.slice(7));
      if (!payload?.sub) return null;
      return await this.usersService.findById(payload.sub);
    } catch {
      return null;
    }
  }

  async bootstrapStatus(): Promise<{ bootstrap: boolean }> {
    const usersCount = await this.usersService.count();
    return { bootstrap: usersCount === 0 };
  }

  async register(dto: RegisterDto, request: Request): Promise<PublicUser> {
    const usersCount = await this.usersService.count();

    if (usersCount === 0) {
      const club = await this.clubsService.create({ name: 'Мой клуб' });
      const owner = await this.usersService.create({
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, 10),
        name: dto.name,
        phone: dto.phone ?? null,
        role: 'owner',
        clubId: club.id,
      });
      await this.clubsService.update(club, { ownerId: owner.id });
      return this.toPublicUser(owner);
    }

    const currentUser = await this.resolveRequestUser(request);
    if (!currentUser) throw new UnauthorizedException('Требуется авторизация');
    if (currentUser.role !== 'owner') throw new ForbiddenException('Недостаточно прав');

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Пользователь с таким email уже существует');

    const role: UserRole = dto.role === 'owner' ? 'owner' : 'employee';
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      name: dto.name,
      phone: dto.phone ?? null,
      role,
      clubId: currentUser.clubId,
    });
    return this.toPublicUser(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Неверный email или пароль');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const token = await this.tokensService.find(refreshToken);
    if (!token || token.expiresAt.getTime() <= Date.now()) {
      if (token) await this.tokensService.remove(refreshToken);
      throw new UnauthorizedException('Недействительный refresh-токен');
    }
    const user = await this.usersService.findById(token.userId);
    await this.tokensService.remove(refreshToken);
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    await this.tokensService.remove(refreshToken);
    return { ok: true };
  }

  async issueTokens(user: User): Promise<AuthTokensResponse> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      clubId: user.clubId,
    });
    const refreshToken = randomBytes(48).toString('hex');
    await this.tokensService.create(user.id, refreshToken, new Date(Date.now() + REFRESH_TTL_MS));
    return { accessToken, refreshToken, user: this.toPublicUser(user) };
  }
}
