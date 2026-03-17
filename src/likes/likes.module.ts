import { Module } from '@nestjs/common';
import { FeedModule } from '../feed/feed.module';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

@Module({
  imports: [FeedModule],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
