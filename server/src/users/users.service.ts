import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  count(): Promise<number> {
    return this.usersRepo.count();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  findByClub(clubId: string | null): Promise<User[]> {
    if (!clubId) return Promise.resolve([]);
    return this.usersRepo.find({ where: { clubId }, order: { createdAt: 'ASC' } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    phone?: string | null;
    role: UserRole;
    clubId?: string | null;
  }): Promise<User> {
    const user = this.usersRepo.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name,
      phone: data.phone ?? null,
      role: data.role,
      clubId: data.clubId ?? null,
    });
    return this.usersRepo.save(user);
  }

  async update(user: User, patch: Partial<User>): Promise<User> {
    Object.assign(user, patch);
    return this.usersRepo.save(user);
  }

  async remove(user: User): Promise<void> {
    await this.usersRepo.remove(user);
  }
}
