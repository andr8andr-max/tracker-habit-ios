import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from './token.entity';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(Token)
    private readonly tokensRepo: Repository<Token>,
  ) {}

  async create(userId: string, token: string, expiresAt: Date): Promise<Token> {
    return this.tokensRepo.save(this.tokensRepo.create({ userId, token, expiresAt }));
  }

  find(token: string): Promise<Token | null> {
    return this.tokensRepo.findOne({ where: { token } });
  }

  async remove(token: string): Promise<void> {
    await this.tokensRepo.delete({ token });
  }

  async revokeAllForUser(userId: string, exceptToken?: string | null): Promise<number> {
    const query = this.tokensRepo.createQueryBuilder().delete().where('user_id = :userId', { userId });
    if (exceptToken) {
      query.andWhere('token <> :except', { except: exceptToken });
    }
    const result = await query.execute();
    return result.affected ?? 0;
  }
}
