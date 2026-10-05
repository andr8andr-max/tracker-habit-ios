import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { ContactLog } from './contact-log.entity';
import { Contact, ContactTag } from './contact.entity';
import { CreateContactDto, CreateContactLogDto, UpdateContactDto } from './dto/contact.dto';

export type ContactSort = 'alpha' | 'last';

export interface ContactView {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  company: string | null;
  city: string | null;
  tag: ContactTag;
  note: string | null;
  linkedEmployeeId: string | null;
  createdAt: Date;
  lastActionAt: string | null;
}

export interface ContactLogView {
  id: string;
  contactId: string;
  action: string;
  durationMin: number | null;
  comment: string | null;
  createdAt: Date;
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactsRepo: Repository<Contact>,
    @InjectRepository(ContactLog)
    private readonly logsRepo: Repository<ContactLog>,
    private readonly usersService: UsersService,
  ) {}

  toView(contact: Contact, lastActionAt: string | null, forUser: User): ContactView {
    return {
      id: contact.id,
      userId: contact.userId,
      name: contact.name,
      phone: contact.phone,
      company: contact.company,
      city: contact.city,
      tag: contact.tag,
      note: contact.note,
      linkedEmployeeId: forUser.role === 'owner' ? contact.linkedEmployeeId : null,
      createdAt: contact.createdAt,
      lastActionAt,
    };
  }

  toLogView(log: ContactLog): ContactLogView {
    return {
      id: log.id,
      contactId: log.contactId,
      action: log.action,
      durationMin: log.durationMin,
      comment: log.comment,
      createdAt: log.createdAt,
    };
  }

  async list(
    user: User,
    options: { q?: string; tag?: ContactTag; sort?: ContactSort },
  ): Promise<ContactView[]> {
    const qb = this.contactsRepo.createQueryBuilder('c').where('c.user_id = :userId', { userId: user.id });

    if (options.q) {
      qb.andWhere('(c.name ILIKE :q OR c.phone ILIKE :q OR c.company ILIKE :q OR c.city ILIKE :q)', {
        q: `%${options.q}%`,
      });
    }
    if (options.tag) {
      qb.andWhere('c.tag = :tag', { tag: options.tag });
    }

    const contacts = await qb.getMany();
    if (contacts.length === 0) return [];

    const logs = await this.logsRepo.find({ where: { contactId: In(contacts.map(c => c.id)) } });
    const lastByContact = new Map<string, string>();
    for (const log of logs) {
      const iso = log.createdAt.toISOString();
      const current = lastByContact.get(log.contactId);
      if (!current || iso > current) lastByContact.set(log.contactId, iso);
    }

    const views = contacts.map(contact =>
      this.toView(contact, lastByContact.get(contact.id) ?? null, user),
    );

    if (options.sort === 'last') {
      views.sort((a, b) => {
        if (a.lastActionAt && b.lastActionAt) {
          if (a.lastActionAt === b.lastActionAt) return a.name.localeCompare(b.name, 'ru');
          return a.lastActionAt < b.lastActionAt ? 1 : -1;
        }
        if (a.lastActionAt && !b.lastActionAt) return -1;
        if (!a.lastActionAt && b.lastActionAt) return 1;
        return a.name.localeCompare(b.name, 'ru');
      });
    } else {
      views.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    }

    return views;
  }

  async create(user: User, dto: CreateContactDto): Promise<ContactView> {
    if (dto.linkedEmployeeId && user.role !== 'owner') {
      throw new ForbiddenException('Привязку к сотруднику может менять только владелец');
    }

    let linkedEmployeeId: string | null = null;
    if (dto.linkedEmployeeId) {
      const employee = await this.usersService.findById(dto.linkedEmployeeId);
      if (!employee || employee.clubId !== user.clubId || employee.id === user.id) {
        throw new NotFoundException('Сотрудник не найден');
      }
      linkedEmployeeId = employee.id;
    }

    const contact = await this.contactsRepo.save(
      this.contactsRepo.create({
        userId: user.id,
        name: dto.name,
        phone: dto.phone ?? null,
        company: dto.company ?? null,
        city: dto.city ?? null,
        tag: dto.tag ?? 'client',
        note: dto.note ?? null,
        linkedEmployeeId,
      }),
    );

    return this.toView(contact, null, user);
  }

  find(id: string): Promise<Contact | null> {
    return this.contactsRepo.findOne({ where: { id } });
  }

  async requireFound(id: string): Promise<Contact> {
    const contact = await this.find(id);
    if (!contact) throw new NotFoundException('Контакт не найден');
    return contact;
  }

  async assertAccess(user: User, contact: Contact): Promise<void> {
    if (contact.userId === user.id) return;
    if (user.role === 'owner') {
      const owner = await this.usersService.findById(contact.userId);
      if (owner && owner.clubId && user.clubId && owner.clubId === user.clubId) return;
    }
    throw new ForbiddenException('Нет доступа к контакту');
  }

  async get(id: string, user: User): Promise<{ contact: ContactView; logs: ContactLogView[] }> {
    const contact = await this.requireFound(id);
    await this.assertAccess(user, contact);
    const logs = await this.logsRepo.find({ where: { contactId: contact.id }, order: { createdAt: 'ASC' } });
    const lastActionAt = logs.length > 0 ? logs[logs.length - 1].createdAt.toISOString() : null;
    return {
      contact: this.toView(contact, lastActionAt, user),
      logs: logs.map(log => this.toLogView(log)),
    };
  }

  async update(id: string, user: User, dto: UpdateContactDto): Promise<ContactView> {
    const contact = await this.requireFound(id);
    await this.assertAccess(user, contact);

    if (dto.linkedEmployeeId !== undefined && user.role !== 'owner') {
      throw new ForbiddenException('Привязку к сотруднику может менять только владелец');
    }

    if (dto.name !== undefined) contact.name = dto.name;
    if (dto.phone !== undefined) contact.phone = dto.phone ?? null;
    if (dto.company !== undefined) contact.company = dto.company ?? null;
    if (dto.city !== undefined) contact.city = dto.city ?? null;
    if (dto.tag !== undefined) contact.tag = dto.tag;
    if (dto.note !== undefined) contact.note = dto.note ?? null;

    if (dto.linkedEmployeeId !== undefined) {
      if (dto.linkedEmployeeId === null) {
        contact.linkedEmployeeId = null;
      } else {
        const employee = await this.usersService.findById(dto.linkedEmployeeId);
        if (!employee || employee.clubId !== user.clubId || employee.id === user.id) {
          throw new NotFoundException('Сотрудник не найден');
        }
        contact.linkedEmployeeId = employee.id;
      }
    }

    const saved = await this.contactsRepo.save(contact);
    const logs = await this.logsRepo.find({ where: { contactId: saved.id } });
    const lastActionAt =
      logs.length > 0
        ? logs.reduce<Date | null>(
            (max, log) => (!max || log.createdAt > max ? log.createdAt : max),
            null,
          )?.toISOString() ?? null
        : null;
    return this.toView(saved, lastActionAt, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const contact = await this.requireFound(id);
    await this.assertAccess(user, contact);
    await this.contactsRepo.remove(contact);
  }

  async addLog(id: string, user: User, dto: CreateContactLogDto): Promise<ContactLogView> {
    const contact = await this.requireFound(id);
    await this.assertAccess(user, contact);
    const log = await this.logsRepo.save(
      this.logsRepo.create({
        contactId: contact.id,
        action: dto.action,
        durationMin: dto.durationMin ?? null,
        comment: dto.comment ?? null,
      }),
    );
    return this.toLogView(log);
  }
}
