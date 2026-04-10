import { Module } from '@nestjs/common';
import { StudentImportsController } from './student-imports.controller';
import { StudentImportsParserService } from './student-imports-parser.service';
import { StudentImportsService } from './student-imports.service';

@Module({
  controllers: [StudentImportsController],
  providers: [StudentImportsParserService, StudentImportsService],
})
export class StudentImportsModule {}
