import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Affiliate } from './affiliate.entity';
import { User } from '../../users/entities/user.entity';

export enum CommissionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum CommissionType {
  SUBSCRIPTION = 'subscription',
  UPGRADE = 'upgrade',
  RENEWAL = 'renewal',
  REFERRAL = 'referral',
}

@Entity('affiliate_commissions')
export class AffiliateCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CommissionType,
    default: CommissionType.SUBSCRIPTION,
  })
  type: CommissionType;

  @Column({
    type: 'enum',
    enum: CommissionStatus,
    default: CommissionStatus.PENDING,
  })
  status: CommissionStatus;

  @Column({ name: 'order_value', type: 'decimal', precision: 10, scale: 2 })
  orderValue: number;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2 })
  commissionRate: number;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 10, scale: 2 })
  commissionAmount: number;

  @Column({ name: 'currency', default: 'BRL' })
  currency: string;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'subscription_id', nullable: true })
  subscriptionId: string;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string;

  @Column({ name: 'click_id', nullable: true })
  clickId: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'paid_by', nullable: true })
  paidBy: string;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'cancelled_by', nullable: true })
  cancelledBy: string;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'external_reference', nullable: true })
  externalReference: string;

  // Relationships
  @ManyToOne(() => Affiliate, affiliate => affiliate.commissions)
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column({ name: 'affiliate_id' })
  affiliateId: string;

  @ManyToOne(() => User, user => user.commissions)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ name: 'customer_id' })
  customerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual Properties
  get isPayable(): boolean {
    return this.status === CommissionStatus.APPROVED;
  }

  get isPaid(): boolean {
    return this.status === CommissionStatus.PAID;
  }

  get isCancelled(): boolean {
    return this.status === CommissionStatus.CANCELLED;
  }
}