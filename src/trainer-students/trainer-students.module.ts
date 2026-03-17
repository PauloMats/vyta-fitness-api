import { Module } from '@nestjs/common';
import { TrainerStudentsController } from './trainer-students.controller';
import { TrainerStudentsService } from './trainer-students.service';

@Module({
  controllers: [TrainerStudentsController],
  providers: [TrainerStudentsService],
  exports: [TrainerStudentsService],
})
export class TrainerStudentsModule {}
