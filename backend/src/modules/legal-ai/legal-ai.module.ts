import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LegalAIController } from './legal-ai.controller';
import { LegalAIService } from './legal-ai.service';
import { LegalKnowledgeService } from './services/legal-knowledge.service';
import { LegalUpdaterService } from './services/legal-updater.service';
import { LegalAnalysisService } from './services/legal-analysis.service';
import { LegalQuery } from './entities/legal-query.entity';
import { LegalDocument } from './entities/legal-document.entity';
import { LegalUpdate } from './entities/legal-update.entity';
import { LegalAnalysis } from './entities/legal-analysis.entity';
import { UsersModule } from '../users/users.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LegalQuery,
      LegalDocument,
      LegalUpdate,
      LegalAnalysis,
    ]),
    ScheduleModule.forRoot(),
    UsersModule,
    OpportunitiesModule,
    NotificationsModule,
  ],
  controllers: [LegalAIController],
  providers: [
    LegalAIService,
    LegalKnowledgeService,
    LegalUpdaterService,
    LegalAnalysisService,
  ],
  exports: [LegalAIService],
})
export class LegalAIModule {}