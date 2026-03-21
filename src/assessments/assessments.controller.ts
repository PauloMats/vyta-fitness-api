import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { JwtUser } from '../common/types/jwt-user.type';
import { AssessmentsService } from './assessments.service';
import { CompleteAssessmentDto } from './dto/complete-assessment.dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { ListStudentAssessmentsDto } from './dto/list-student-assessments.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

@ApiTags('assessments')
@ApiBearerAuth()
@Controller()
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @Post('assessments')
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(user, dto);
  }

  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @Patch('assessments/:id')
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateAssessmentDto) {
    return this.assessmentsService.update(user, id, dto);
  }

  @Roles(UserRole.TRAINER, UserRole.ADMIN)
  @Post('assessments/:id/complete')
  complete(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: CompleteAssessmentDto) {
    return this.assessmentsService.complete(user, id, dto);
  }

  @Get('assessments/:id')
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.assessmentsService.findOne(user, id);
  }

  @Get('students/:studentId/assessments')
  listForStudent(
    @CurrentUser() user: JwtUser,
    @Param('studentId') studentId: string,
    @Query() query: ListStudentAssessmentsDto,
  ) {
    return this.assessmentsService.listForStudent(user, studentId, query);
  }

  @Get('students/:studentId/progress')
  progress(@CurrentUser() user: JwtUser, @Param('studentId') studentId: string) {
    return this.assessmentsService.progress(user, studentId);
  }
}
