import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Affiliate } from './affiliate.entity';

@Entity('affiliate_clicks')
export class AffiliateClick {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ip_address' })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text' })
  userAgent: string;

  @Column({ name: 'referrer_url', nullable: true })
  referrerUrl: string;

  @Column({ name: 'landing_page' })
  landingPage: string;

  @Column({ name: 'utm_source', nullable: true })
  utmSource: string;

  @Column({ name: 'utm_medium', nullable: true })
  utmMedium: string;

  @Column({ name: 'utm_campaign', nullable: true })
  utmCampaign: string;

  @Column({ name: 'utm_term', nullable: true })
  utmTerm: string;

  @Column({ name: 'utm_content', nullable: true })
  utmContent: string;

  @Column({ name: 'device_type', nullable: true })
  deviceType: string;

  @Column({ name: 'browser', nullable: true })
  browser: string;

  @Column({ name: 'operating_system', nullable: true })
  operatingSystem: string;

  @Column({ name: 'country', nullable: true })
  country: string;

  @Column({ name: 'city', nullable: true })
  city: string;

  @Column({ name: 'converted', default: false })
  converted: boolean;

  @Column({ name: 'converted_at', type: 'timestamp', nullable: true })
  convertedAt: Date;

  @Column({ name: 'session_id', nullable: true })
  sessionId: string;

  @Column({ name: 'visitor_id', nullable: true })
  visitorId: string;

  // Relationships
  @ManyToOne(() => Affiliate, affiliate => affiliate.clicks)
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column({ name: 'affiliate_id' })
  affiliateId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}