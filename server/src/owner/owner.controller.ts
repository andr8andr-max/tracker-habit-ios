import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../users/user.entity';
import { CreateEmployeeDto, UpdateClubDto } from './dto/owner.dto';
import { OwnerService } from './owner.service';

@Roles('owner')
@Controller('owner')
export class OwnerController {
  constructor(private readonly ownerService: OwnerService) {}

  @Get('employees')
  employees(@CurrentUser() user: User) {
    return this.ownerService.employees(user);
  }

  @Post('employees')
  createEmployee(@CurrentUser() user: User, @Body() dto: CreateEmployeeDto) {
    return this.ownerService.createEmployee(user, dto);
  }

  @Delete('employees/:id')
  @HttpCode(201)
  deleteEmployee(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ownerService.deleteEmployee(user, id);
  }

  @Patch('club')
  @HttpCode(201)
  patchClub(@CurrentUser() user: User, @Body() dto: UpdateClubDto) {
    return this.ownerService.patchClub(user, dto);
  }
}
