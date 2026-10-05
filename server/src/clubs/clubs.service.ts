import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Club } from './club.entity';

@Injectable()
export class ClubsService {
  constructor(
    @InjectRepository(Club)
    private readonly clubsRepo: Repository<Club>,
  ) {}

  findById(id: string): Promise<Club | null> {
    return this.clubsRepo.findOne({ where: { id } });
  }

  findByOwnerId(ownerId: string): Promise<Club | null> {
    return this.clubsRepo.findOne({ where: { ownerId } });
  }

  findByName(name: string): Promise<Club | null> {
    return this.clubsRepo.findOne({ where: { name } });
  }

  async create(data: { name: string; ownerId?: string | null }): Promise<Club> {
    const club = this.clubsRepo.create({
      name: data.name,
      ownerId: data.ownerId ?? null,
      logoUrl: null,
      address: null,
    });
    return this.clubsRepo.save(club);
  }

  async update(club: Club, patch: Partial<Club>): Promise<Club> {
    Object.assign(club, patch);
    return this.clubsRepo.save(club);
  }
}
