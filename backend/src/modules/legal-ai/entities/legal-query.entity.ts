import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum QueryType {
  GENERAL = 'general',
  DOCUMENT_ANALYSIS = 'document_analysis',
  COMPLIANCE_CHECK = 'compliance_check',
  RISK_ASSESSMENT = 'risk_assessment',
  DEADLINE_INQUIRY = 'deadline_inquiry',
  PROCEDURE_GUIDANCE = 'procedure_guidance',
  JURISPRUDENCE = 'jurisprudence',
  INTERPRETATION = 'interpretation',
}

export enum QueryStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum QueryPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('legal_queries')
export class LegalQuery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'query_text', type: 'text' })
  queryText: string;

  @Column({
    type: 'enum',
    enum: QueryType,
    default: QueryType.GENERAL,
  })
  @Index('idx_legal_query_type')
  type: QueryType;

  @Column({
    type: 'enum',
    enum: QueryStatus,
    default: QueryStatus.PENDING,
  })
  @Index('idx_legal_query_status')
  status: QueryStatus;

  @Column({
    type: 'enum',
    enum: QueryPriority,
    default: QueryPriority.MEDIUM,
  })
  priority: QueryPriority;

  @Column({ name: 'response_text', type: 'text', nullable: true })
  responseText: string;

  @Column({ name: 'legal_references', type: 'json', nullable: true })
  legalReferences: {
    documentId: string;
    documentNumber: string;
    title: string;
    article?: string;
    paragraph?: string;
    relevance: number;
    excerpt?: string;
  }[];

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number;

  @Column({ name: 'processing_time', nullable: true })
  processingTime: number;

  @Column({ name: 'context_data', type: 'json', nullable: true })
  contextData: {
    opportunityId?: string;
    editalUrl?: string;
    documentType?: string;
    companySize?: string;
    sector?: string;
    previousQueries?: string[];
    sessionId?: string;
  };

  @Column({ name: 'tags', type: 'json', nullable: true })
  tags: string[];

  @Column({ name: 'feedback_rating', nullable: true })
  feedbackRating: number;

  @Column({ name: 'feedback_comment', type: 'text', nullable: true })
  feedbackComment: string;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'follow_up_questions', type: 'json', nullable: true })
  followUpQuestions: string[];

  @Column({ name: 'warning_flags', type: 'json', nullable: true })
  warningFlags: {
    type: 'deadline' | 'compliance' | 'risk' | 'requirement';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    deadline?: Date;
  }[];

  @Column({ name: 'related_queries', type: 'json', nullable: true })
  relatedQueries: string[];

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  // Relationships
  @ManyToOne(() => User, user => user.legalQueries)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_legal_query_created_at')
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual Properties
  get isPending(): boolean {
    return this.status === QueryStatus.PENDING;
  }

  get isProcessing(): boolean {
    return this.status === QueryStatus.PROCESSING;
  }

  get isCompleted(): boolean {
    return this.status === QueryStatus.COMPLETED;
  }

  get hasFailed(): boolean {
    return this.status === QueryStatus.FAILED;
  }

  get hasHighConfidence(): boolean {
    return this.confidenceScore !== null && this.confidenceScore >= 0.8;
  }

  get hasWarnings(): boolean {
    return this.warningFlags && this.warningFlags.length > 0;
  }

  get criticalWarnings(): typeof this.warningFlags {
    return this.warningFlags?.filter(w => w.severity === 'critical') || [];
  }

  get highPriorityWarnings(): typeof this.warningFlags {
    return this.warningFlags?.filter(w => w.severity === 'high') || [];
  }

  // Helper methods
  addTag(tag: string): void {
    if (!this.tags) {
      this.tags = [];
    }
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter(t => t !== tag);
    }
  }

  addWarningFlag(warning: typeof this.warningFlags[0]): void {
    if (!this.warningFlags) {
      this.warningFlags = [];
    }
    this.warningFlags.push(warning);
  }

  removeWarningFlag(index: number): void {
    if (this.warningFlags && this.warningFlags[index]) {
      this.warningFlags.splice(index, 1);
    }
  }

  addLegalReference(reference: typeof this.legalReferences[0]): void {
    if (!this.legalReferences) {
      this.legalReferences = [];
    }
    this.legalReferences.push(reference);
  }

  setProcessingStarted(): void {
    this.status = QueryStatus.PROCESSING;
    this.startedAt = new Date();
  }

  setCompleted(responseText: string, confidenceScore: number): void {
    this.status = QueryStatus.COMPLETED;
    this.responseText = responseText;
    this.confidenceScore = confidenceScore;
    this.completedAt = new Date();
    
    if (this.startedAt) {
      this.processingTime = this.completedAt.getTime() - this.startedAt.getTime();
    }
  }

  setFailed(errorMessage: string): void {
    this.status = QueryStatus.FAILED;
    this.errorMessage = errorMessage;
    this.completedAt = new Date();
    
    if (this.startedAt) {
      this.processingTime = this.completedAt.getTime() - this.startedAt.getTime();
    }
  }

  setFeedback(rating: number, comment?: string): void {
    this.feedbackRating = rating;
    this.feedbackComment = comment;
  }
}