import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as webpush from 'web-push';
import { Repository } from 'typeorm';
import { StoredPushSubscription, User } from '../users/user.entity';
import { UpdateNotificationsDto } from '../profile/dto/profile.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('WebPush');
  private publicKey: string;
  private privateKey: string;
  private readonly subject: string;

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {
    const envPublic = process.env.VAPID_PUBLIC_KEY;
    const envPrivate = process.env.VAPID_PRIVATE_KEY;
    if (envPublic && envPrivate) {
      this.publicKey = envPublic;
      this.privateKey = envPrivate;
    } else {
      const keys = webpush.generateVAPIDKeys();
      this.publicKey = keys.publicKey;
      this.privateKey = keys.privateKey;
      process.env.VAPID_PUBLIC_KEY = keys.publicKey;
      process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    }
    this.subject = process.env.VAPID_SUBJECT || 'mailto:ops@club.local';
    this.logger.log(`WEB PUSH: VAPID public key ${this.publicKey}`);
  }

  getSettings(user: User) {
    return {
      enabled: user.notificationsEnabled,
      time: user.notificationsTime,
      vapidPublicKey: this.publicKey,
      subscription: user.pushSubscription ?? null,
      pushSupported: true,
    };
  }

  async updateSettings(user: User, dto: UpdateNotificationsDto): Promise<{ enabled: boolean; time: string }> {
    const patch: Partial<User> = {};
    if (dto.enabled !== undefined) patch.notificationsEnabled = dto.enabled;
    if (dto.time !== undefined) patch.notificationsTime = dto.time;
    const updated = await this.usersRepo.save({ ...user, ...patch });
    return { enabled: updated.notificationsEnabled, time: updated.notificationsTime };
  }

  async subscribe(user: User, dto: { endpoint: string; expirationTime?: string | null; keys: Record<string, string> }) {
    const subscription: StoredPushSubscription = {
      endpoint: dto.endpoint,
      expirationTime: dto.expirationTime ?? null,
      keys: { p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    };
    user.pushSubscription = subscription;
    await this.usersRepo.save(user);
    return { ok: true };
  }

  async unsubscribe(user: User): Promise<{ ok: true }> {
    user.pushSubscription = null;
    await this.usersRepo.save(user);
    return { ok: true };
  }

  private isValidSubscription(subscription: StoredPushSubscription | null | undefined): subscription is StoredPushSubscription {
    return Boolean(subscription?.endpoint && subscription.keys?.p256dh && subscription.keys?.auth);
  }

  async sendToUser(user: User, payload: { title: string; body: string }): Promise<void> {
    const subscription = user.pushSubscription;
    if (!this.isValidSubscription(subscription)) return;

    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys as { p256dh: string; auth: string } },
        JSON.stringify(payload),
        {
          vapidDetails: {
            subject: this.subject,
            publicKey: this.publicKey,
            privateKey: this.privateKey,
          },
        },
      );
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        user.pushSubscription = null;
        await this.usersRepo.save(user);
        this.logger.log(`Удалена недействительная push-подписка пользователя ${user.id}`);
        return;
      }
      this.logger.warn(`Ошибка отправки push пользователю ${user.id}: ${(error as Error)?.message}`);
    }
  }
}
