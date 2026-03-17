import { Module } from '@nestjs/common';
import { FeedModule } from '../feed/feed.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [FeedModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
