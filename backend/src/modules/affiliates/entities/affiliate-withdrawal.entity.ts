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

export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum WithdrawalMethod {
  BANK_TRANSFER = 'bank_transfer',
  PIX = 'pix',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

@Entity('affiliate_withdrawals')
export class AffiliateWithdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 10, scale: 2 })
  netAmount: number;

  @Column({ name: 'currency', default: 'BRL' })
  currency: string;

  @Column({
    type: 'enum',
    enum: WithdrawalMethod,
    default: WithdrawalMethod.PIX,
  })
  method: WithdrawalMethod;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

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

  @Column({ name: 'external_id', nullable: true })
  externalId: string;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ name: 'processed_by', nullable: true })
  processedBy: string;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'cancelled_by', nullable: true })
  cancelledBy: string;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'receipt_url', nullable: true })
  receiptUrl: string;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => Affiliate, affiliate => affiliate.withdrawals)
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column({ name: 'affiliate_id' })
  affiliateId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual Properties
  get isPending(): boolean {
    return this.status === WithdrawalStatus.PENDING;
  }

  get isProcessing(): boolean {
    return this.status === WithdrawalStatus.PROCESSING;
  }

  get isCompleted(): boolean {
    return this.status === WithdrawalStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return this.status === WithdrawalStatus.FAILED;
  }

  get isCancelled(): boolean {
    return this.status === WithdrawalStatus.CANCELLED;
  }

  get canCancel(): boolean {
    return this.status === WithdrawalStatus.PENDING || this.status === WithdrawalStatus.PROCESSING;
  }
}