import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Roles('STUDENT')
  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.studentsService.me(userId);
  }

  @Roles('STUDENT')
  @Patch('me')
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateStudentProfileDto) {
    return this.studentsService.update(userId, dto);
  }
}
