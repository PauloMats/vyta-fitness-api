import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { ListTrainerStudentsDto } from './dto/list-trainer-students.dto';
import { RequestTrainerStudentDto } from './dto/request-trainer-student.dto';
import { UpdateTrainerStudentStatusDto } from './dto/update-trainer-student-status.dto';
import { TrainerStudentsService } from './trainer-students.service';

@ApiTags('trainer-students')
@ApiBearerAuth()
@Controller('trainer-students')
export class TrainerStudentsController {
  constructor(private readonly trainerStudentsService: TrainerStudentsService) {}

  @Post('request')
  request(@CurrentUser() user: JwtUser, @Body() dto: RequestTrainerStudentDto) {
    return this.trainerStudentsService.request(user, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateTrainerStudentStatusDto,
  ) {
    return this.trainerStudentsService.updateStatus(user, id, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListTrainerStudentsDto) {
    return this.trainerStudentsService.list(user, query);
  }
}
