import { Body, Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/user.entity';
import {
  ChangePasswordDto,
  PushSubscriptionDto,
  UpdateNotificationsDto,
  UpdateProfileDto,
} from './dto/profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  get(@CurrentUser() user: User) {
    return this.profileService.get(user);
  }

  @Patch()
  update(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.profileService.update(user, dto);
  }

  @Patch('password')
  @HttpCode(201)
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(user, dto);
  }

  @Get('notifications')
  notifications(@CurrentUser() user: User) {
    return this.notificationsService.getSettings(user);
  }

  @Patch('notifications')
  updateNotifications(@CurrentUser() user: User, @Body() dto: UpdateNotificationsDto) {
    return this.notificationsService.updateSettings(user, dto);
  }

  @Post('push/subscribe')
  subscribe(@CurrentUser() user: User, @Body() dto: PushSubscriptionDto) {
    return this.notificationsService.subscribe(user, dto);
  }

  @Delete('push/subscribe')
  @HttpCode(201)
  unsubscribe(@CurrentUser() user: User) {
    return this.notificationsService.unsubscribe(user);
  }
}
