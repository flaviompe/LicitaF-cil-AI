import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AffiliatesController } from './affiliates.controller';
import { AffiliatesService } from './affiliates.service';
import { Affiliate } from './entities/affiliate.entity';
import { AffiliateClick } from './entities/affiliate-click.entity';
import { AffiliateCommission } from './entities/affiliate-commission.entity';
import { AffiliateWithdrawal } from './entities/affiliate-withdrawal.entity';
import { UsersModule } from '../users/users.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Affiliate,
      AffiliateClick,
      AffiliateCommission,
      AffiliateWithdrawal,
    ]),
    UsersModule,
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [AffiliatesController],
  providers: [AffiliatesService],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}