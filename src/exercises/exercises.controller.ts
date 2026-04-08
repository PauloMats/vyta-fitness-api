import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateExerciseLibraryDto } from './dto/create-exercise-library.dto';
import { ExerciseAutocompleteQueryDto } from './dto/exercise-autocomplete-query.dto';
import { ImportExerciseCatalogDto } from './dto/import-exercise-catalog.dto';
import { ListExerciseLibraryDto } from './dto/list-exercise-library.dto';
import { UpdateExerciseLibraryDto } from './dto/update-exercise-library.dto';
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

  @Get('library/autocomplete')
  autocomplete(@Query() query: ExerciseAutocompleteQueryDto) {
    return this.exercisesService.autocomplete(query);
  }

  @Get('library/filters/meta')
  filtersMeta() {
    return this.exercisesService.filtersMeta();
  }

  @Roles('ADMIN')
  @Post('library/import')
  importCatalog(@Body() dto: ImportExerciseCatalogDto) {
    return this.exercisesService.importCatalog(dto);
  }

  @Roles('TRAINER', 'ADMIN')
  @Patch('library/:id')
  update(@Param('id') id: string, @Body() dto: UpdateExerciseLibraryDto) {
    return this.exercisesService.update(id, dto);
  }

  @Get('library/:id')
  findOne(@Param('id') id: string) {
    return this.exercisesService.findOne(id);
  }
}
