import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ClubsService } from '../clubs/clubs.service';
import { TokensService } from '../auth/tokens.service';
import { StoredPushSubscription, User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, UpdateNotificationsDto, UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersService: UsersService,
    private readonly clubsService: ClubsService,
    private readonly tokensService: TokensService,
  ) {}

  async get(user: User) {
    const club = user.clubId ? await this.clubsService.findById(user.clubId) : null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      clubId: user.clubId,
      createdAt: user.createdAt,
      club: club
        ? { id: club.id, name: club.name, logoUrl: club.logoUrl, address: club.address, ownerId: club.ownerId }
        : null,
      globalNotifications: {
        enabled: user.notificationsEnabled,
        time: user.notificationsTime,
      },
    };
  }

  async update(user: User, dto: UpdateProfileDto) {
    const patch: Partial<User> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.phone !== undefined) patch.phone = dto.phone ?? null;
    if (dto.avatarUrl !== undefined) patch.avatarUrl = dto.avatarUrl ?? null;
    const updated = await this.usersService.update(user, patch);
    return this.get(updated);
  }

  async changePassword(user: User, dto: ChangePasswordDto): Promise<{ ok: true; revokedSessions: number }> {
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Неверный текущий пароль');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.update(user, { passwordHash: user.passwordHash });

    const revokedSessions = await this.tokensService.revokeAllForUser(user.id, dto.refreshToken ?? null);
    return { ok: true, revokedSessions };
  }
}
