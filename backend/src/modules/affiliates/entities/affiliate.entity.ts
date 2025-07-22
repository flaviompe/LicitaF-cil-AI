import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AffiliateClick } from './affiliate-click.entity';
import { AffiliateCommission } from './affiliate-commission.entity';
import { AffiliateWithdrawal } from './affiliate-withdrawal.entity';

export enum AffiliateStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum AffiliateType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
  INFLUENCER = 'influencer',
  PARTNER = 'partner',
}

@Entity('affiliates')
export class Affiliate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({
    type: 'enum',
    enum: AffiliateStatus,
    default: AffiliateStatus.PENDING,
  })
  status: AffiliateStatus;

  @Column({
    type: 'enum',
    enum: AffiliateType,
    default: AffiliateType.INDIVIDUAL,
  })
  type: AffiliateType;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ name: 'total_clicks', default: 0 })
  totalClicks: number;

  @Column({ name: 'total_conversions', default: 0 })
  totalConversions: number;

  @Column({ name: 'total_earned', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarned: number;

  @Column({ name: 'available_balance', type: 'decimal', precision: 10, scale: 2, default: 0 })
  availableBalance: number;

  @Column({ name: 'pending_balance', type: 'decimal', precision: 10, scale: 2, default: 0 })
  pendingBalance: number;

  @Column({ name: 'withdrawn_balance', type: 'decimal', precision: 10, scale: 2, default: 0 })
  withdrawnBalance: number;

  // Payment Information
  @Column({ name: 'bank_name', nullable: true })
  bankName: string;

  @Column({ name: 'account_holder', nullable: true })
  accountHolder: string;

  @Column({ name: 'account_number', nullable: true })
  accountNumber: string;

  @Column({ name: 'account_type', nullable: true })
  accountType: string;

  @Column({ name: 'pix_key', nullable: true })
  pixKey: string;

  @Column({ name: 'pix_type', nullable: true })
  pixType: string;

  // Marketing Information
  @Column({ name: 'website_url', nullable: true })
  websiteUrl: string;

  @Column({ name: 'social_media', type: 'json', nullable: true })
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };

  @Column({ name: 'marketing_channels', type: 'json', nullable: true })
  marketingChannels: string[];

  @Column({ name: 'target_audience', type: 'text', nullable: true })
  targetAudience: string;

  @Column({ name: 'monthly_traffic', nullable: true })
  monthlyTraffic: number;

  @Column({ name: 'promotion_strategy', type: 'text', nullable: true })
  promotionStrategy: string;

  // Application Information
  @Column({ name: 'application_notes', type: 'text', nullable: true })
  applicationNotes: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'suspended_at', type: 'timestamp', nullable: true })
  suspendedAt: Date;

  @Column({ name: 'suspended_by', nullable: true })
  suspendedBy: string;

  @Column({ name: 'suspension_reason', type: 'text', nullable: true })
  suspensionReason: string;

  // Relationships
  @OneToOne(() => User, user => user.affiliate)
  @JoinColumn()
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToMany(() => AffiliateClick, click => click.affiliate)
  clicks: AffiliateClick[];

  @OneToMany(() => AffiliateCommission, commission => commission.affiliate)
  commissions: AffiliateCommission[];

  @OneToMany(() => AffiliateWithdrawal, withdrawal => withdrawal.affiliate)
  withdrawals: AffiliateWithdrawal[];

  @ManyToOne(() => Affiliate, affiliate => affiliate.referrals, { nullable: true })
  referredBy: Affiliate;

  @OneToMany(() => Affiliate, affiliate => affiliate.referredBy)
  referrals: Affiliate[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual Properties
  get conversionRate(): number {
    return this.totalClicks > 0 ? (this.totalConversions / this.totalClicks) * 100 : 0;
  }

  get averageOrderValue(): number {
    return this.totalConversions > 0 ? Number(this.totalEarned) / this.totalConversions : 0;
  }

  get isActive(): boolean {
    return this.status === AffiliateStatus.APPROVED;
  }

  get canWithdraw(): boolean {
    return this.isActive && Number(this.availableBalance) >= 50; // Minimum withdrawal amount
  }
}