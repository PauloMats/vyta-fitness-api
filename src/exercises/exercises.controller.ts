import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateExerciseLibraryDto } from './dto/create-exercise-library.dto';
import { ListExerciseLibraryDto } from './dto/list-exercise-library.dto';
import { ExercisesService } from './exercises.service';

@ApiTags('exercises')
@ApiBearerAuth()
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Roles('TRAINER', 'ADMIN')
  @Post('library')
  create(@Body() dto: CreateExerciseLibraryDto) {
    return this.exercisesService.create(dto);
  }

  @Get('library')
  list(@Query() query: ListExerciseLibraryDto) {
    return this.exercisesService.list(query);
  }

  @Get('library/:id')
  findOne(@Param('id') id: string) {
    return this.exercisesService.findOne(id);
  }
}
