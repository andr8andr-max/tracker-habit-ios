import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { ClubsService } from '../clubs/clubs.service';
import { Contact } from '../contacts/contact.entity';
import { Habit } from '../habits/habit.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { CreateEmployeeDto, UpdateClubDto } from './dto/owner.dto';

interface EmployeeRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: User['role'];
  createdAt: Date;
  contactsCount: number;
  habitsCount: number;
}

@Injectable()
export class OwnerService {
  constructor(
    private readonly usersService: UsersService,
    private readonly clubsService: ClubsService,
    @InjectRepository(Contact)
    private readonly contactsRepo: Repository<Contact>,
    @InjectRepository(Habit)
    private readonly habitsRepo: Repository<Habit>,
  ) {}

  async employees(owner: User) {
    const users = await this.usersService.findByClub(owner.clubId);
    const result: EmployeeRow[] = [];
    for (const user of users) {
      if (user.id === owner.id) continue;
      result.push({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        contactsCount: await this.contactsRepo.count({ where: { userId: user.id } }),
        habitsCount: await this.habitsRepo.count({ where: { userId: user.id } }),
      });
    }
    return result;
  }

  async createEmployee(owner: User, dto: CreateEmployeeDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Пользователь с таким email уже существует');

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      name: dto.name,
      phone: dto.phone ?? null,
      role: 'employee',
      clubId: owner.clubId,
    });

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

  async deleteEmployee(owner: User, id: string): Promise<{ ok: true }> {
    if (id === owner.id) throw new BadRequestException('Нельзя удалить самого себя');
    const user = await this.usersService.findById(id);
    if (!user || (owner.clubId && user.clubId !== owner.clubId)) {
      throw new NotFoundException('Сотрудник не найден');
    }
    await this.usersService.remove(user);
    return { ok: true };
  }

  async patchClub(owner: User, dto: UpdateClubDto) {
    const club = owner.clubId ? await this.clubsService.findById(owner.clubId) : null;
    if (!club) throw new NotFoundException('Клуб не найден');

    const patch: Partial<typeof club> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.logoUrl !== undefined) patch.logoUrl = dto.logoUrl ?? null;
    if (dto.address !== undefined) patch.address = dto.address ?? null;

    const updated = await this.clubsService.update(club, patch);
    return {
      id: updated.id,
      name: updated.name,
      logoUrl: updated.logoUrl,
      address: updated.address,
      ownerId: updated.ownerId,
    };
  }
}
