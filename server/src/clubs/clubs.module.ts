import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Club } from './club.entity';
import { ClubsService } from './clubs.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Club])],
  providers: [ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}
