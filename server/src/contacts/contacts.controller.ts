import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../users/user.entity';
import { ContactsService } from './contacts.service';
import { CreateContactDto, CreateContactLogDto, UpdateContactDto } from './dto/contact.dto';
import { ListContactsQueryDto } from './dto/list-contacts-query.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListContactsQueryDto) {
    return this.contactsService.list(user, { q: query.q, tag: query.tag, sort: query.sort ?? 'alpha' });
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateContactDto) {
    return this.contactsService.create(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.contactsService.get(id, user);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, user, dto);
  }

  @Roles('owner')
  @Delete(':id')
  @HttpCode(201)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.contactsService.remove(id, user);
    return { ok: true };
  }

  @Post(':id/logs')
  addLog(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateContactLogDto) {
    return this.contactsService.addLog(id, user, dto);
  }
}
