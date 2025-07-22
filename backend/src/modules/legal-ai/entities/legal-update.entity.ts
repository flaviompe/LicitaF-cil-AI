import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UpdateType {
  NEW_DOCUMENT = 'new_document',
  DOCUMENT_AMENDMENT = 'document_amendment',
  DOCUMENT_REVOCATION = 'document_revocation',
  JURISPRUDENCE_UPDATE = 'jurisprudence_update',
  PROCEDURE_CHANGE = 'procedure_change',
  SYSTEM_UPDATE = 'system_update',
}

export enum UpdateStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum UpdateSource {
  PLANALTO = 'planalto',
  COMPRAS_GOV = 'compras_gov',
  TCU = 'tcu',
  CGU = 'cgu',
  SENADO = 'senado',
  CAMARA = 'camara',
  STJ = 'stj',
  STF = 'stf',
  BEC_SP = 'bec_sp',
  LICITACOES_E = 'licitacoes_e',
  MANUAL = 'manual',
}

@Entity('legal_updates')
export class LegalUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: UpdateType,
    default: UpdateType.NEW_DOCUMENT,
  })
  @Index('idx_legal_update_type')
  type: UpdateType;

  @Column({
    type: 'enum',
    enum: UpdateStatus,
    default: UpdateStatus.PENDING,
  })
  @Index('idx_legal_update_status')
  status: UpdateStatus;

  @Column({
    type: 'enum',
    enum: UpdateSource,
    default: UpdateSource.MANUAL,
  })
  @Index('idx_legal_update_source')
  source: UpdateSource;

  @Column({ name: 'source_url' })
  sourceUrl: string;

  @Column({ name: 'document_number', nullable: true })
  documentNumber: string;

  @Column({ name: 'document_title', nullable: true })
  documentTitle: string;

  @Column({ name: 'publication_date', type: 'date', nullable: true })
  publicationDate: Date;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ name: 'change_summary', type: 'text', nullable: true })
  changeSummary: string;

  @Column({ name: 'impact_assessment', type: 'text', nullable: true })
  impactAssessment: string;

  @Column({ name: 'affected_documents', type: 'json', nullable: true })
  affectedDocuments: string[];

  @Column({ name: 'new_requirements', type: 'json', nullable: true })
  newRequirements: string[];

  @Column({ name: 'deprecated_requirements', type: 'json', nullable: true })
  deprecatedRequirements: string[];

  @Column({ name: 'raw_content', type: 'text', nullable: true })
  rawContent: string;

  @Column({ name: 'processed_content', type: 'text', nullable: true })
  processedContent: string;

  @Column({ name: 'hash_checksum', nullable: true })
  hashChecksum: string;

  @Column({ name: 'priority_level', default: 5 })
  priorityLevel: number;

  @Column({ name: 'notification_sent', default: false })
  notificationSent: boolean;

  @Column({ name: 'users_notified', default: 0 })
  usersNotified: number;

  @Column({ name: 'processing_errors', type: 'json', nullable: true })
  processingErrors: {
    step: string;
    error: string;
    timestamp: Date;
  }[];

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: {
    scrapingInfo?: {
      userAgent: string;
      timestamp: Date;
      responseTime: number;
    };
    processingInfo?: {
      aiModel: string;
      confidenceScore: number;
      processingTime: number;
    };
    validationInfo?: {
      validator: string;
      validationDate: Date;
      validationNotes: string;
    };
  };

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'next_check_at', type: 'timestamp', nullable: true })
  nextCheckAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_legal_update_created_at')
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual Properties
  get isPending(): boolean {
    return this.status === UpdateStatus.PENDING;
  }

  get isProcessing(): boolean {
    return this.status === UpdateStatus.PROCESSING;
  }

  get isCompleted(): boolean {
    return this.status === UpdateStatus.COMPLETED;
  }

  get hasFailed(): boolean {
    return this.status === UpdateStatus.FAILED;
  }

  get isSkipped(): boolean {
    return this.status === UpdateStatus.SKIPPED;
  }

  get isHighPriority(): boolean {
    return this.priorityLevel >= 8;
  }

  get isCritical(): boolean {
    return this.priorityLevel >= 9;
  }

  get hasErrors(): boolean {
    return this.processingErrors && this.processingErrors.length > 0;
  }

  get processingTime(): number | null {
    if (this.startedAt && this.completedAt) {
      return this.completedAt.getTime() - this.startedAt.getTime();
    }
    return null;
  }

  get shouldNotifyUsers(): boolean {
    return this.isCompleted && !this.notificationSent && this.priorityLevel >= 6;
  }

  // Helper methods
  setProcessingStarted(): void {
    this.status = UpdateStatus.PROCESSING;
    this.startedAt = new Date();
  }

  setCompleted(processedContent?: string): void {
    this.status = UpdateStatus.COMPLETED;
    this.completedAt = new Date();
    if (processedContent) {
      this.processedContent = processedContent;
    }
  }

  setFailed(error: string): void {
    this.status = UpdateStatus.FAILED;
    this.completedAt = new Date();
    this.addProcessingError('general', error);
  }

  setSkipped(reason: string): void {
    this.status = UpdateStatus.SKIPPED;
    this.completedAt = new Date();
    this.addProcessingError('skipped', reason);
  }

  addProcessingError(step: string, error: string): void {
    if (!this.processingErrors) {
      this.processingErrors = [];
    }
    this.processingErrors.push({
      step,
      error,
      timestamp: new Date(),
    });
  }

  addAffectedDocument(documentId: string): void {
    if (!this.affectedDocuments) {
      this.affectedDocuments = [];
    }
    if (!this.affectedDocuments.includes(documentId)) {
      this.affectedDocuments.push(documentId);
    }
  }

  addNewRequirement(requirement: string): void {
    if (!this.newRequirements) {
      this.newRequirements = [];
    }
    if (!this.newRequirements.includes(requirement)) {
      this.newRequirements.push(requirement);
    }
  }

  addDeprecatedRequirement(requirement: string): void {
    if (!this.deprecatedRequirements) {
      this.deprecatedRequirements = [];
    }
    if (!this.deprecatedRequirements.includes(requirement)) {
      this.deprecatedRequirements.push(requirement);
    }
  }

  markNotificationSent(usersCount: number): void {
    this.notificationSent = true;
    this.usersNotified = usersCount;
  }

  scheduleNextCheck(hours: number): void {
    this.nextCheckAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  updateMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }
}