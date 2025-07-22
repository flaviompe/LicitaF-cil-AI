import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LegalDocumentType {
  LAW = 'law',
  DECREE = 'decree',
  ORDINANCE = 'ordinance',
  RESOLUTION = 'resolution',
  INSTRUCTION = 'instruction',
  SUMULA = 'sumula',
  JURISPRUDENCE = 'jurisprudence',
  MANUAL = 'manual',
  GUIDE = 'guide',
  FAQ = 'faq',
}

export enum LegalDocumentStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  SUPERSEDED = 'superseded',
  SUSPENDED = 'suspended',
}

@Entity('legal_documents')
export class LegalDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index('idx_legal_document_number')
  number: string;

  @Column()
  @Index('idx_legal_document_title')
  title: string;

  @Column({ name: 'short_title', nullable: true })
  shortTitle: string;

  @Column({
    type: 'enum',
    enum: LegalDocumentType,
    default: LegalDocumentType.LAW,
  })
  @Index('idx_legal_document_type')
  type: LegalDocumentType;

  @Column({
    type: 'enum',
    enum: LegalDocumentStatus,
    default: LegalDocumentStatus.ACTIVE,
  })
  @Index('idx_legal_document_status')
  status: LegalDocumentStatus;

  @Column({ name: 'publication_date', type: 'date' })
  @Index('idx_legal_document_publication_date')
  publicationDate: Date;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: Date;

  @Column({ name: 'revocation_date', type: 'date', nullable: true })
  revocationDate: Date;

  @Column({ name: 'issuing_authority' })
  issuingAuthority: string;

  @Column({ name: 'source_url' })
  sourceUrl: string;

  @Column({ name: 'full_text', type: 'text' })
  fullText: string;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary: string;

  @Column({ name: 'key_points', type: 'json', nullable: true })
  keyPoints: string[];

  @Column({ name: 'tags', type: 'json', nullable: true })
  tags: string[];

  @Column({ name: 'related_documents', type: 'json', nullable: true })
  relatedDocuments: string[];

  @Column({ name: 'search_keywords', type: 'text', nullable: true })
  searchKeywords: string;

  @Column({ name: 'relevance_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  relevanceScore: number;

  @Column({ name: 'access_count', default: 0 })
  accessCount: number;

  @Column({ name: 'last_accessed', type: 'timestamp', nullable: true })
  lastAccessed: Date;

  @Column({ name: 'last_updated_from_source', type: 'timestamp', nullable: true })
  lastUpdatedFromSource: Date;

  @Column({ name: 'hash_checksum', nullable: true })
  hashChecksum: string;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: {
    articles?: number;
    paragraphs?: number;
    amendments?: string[];
    supersedes?: string[];
    supersededBy?: string[];
    relatedLaws?: string[];
    applicableScopes?: string[];
    penalties?: string[];
    deadlines?: string[];
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual Properties
  get isActive(): boolean {
    return this.status === LegalDocumentStatus.ACTIVE;
  }

  get isRevoked(): boolean {
    return this.status === LegalDocumentStatus.REVOKED;
  }

  get displayName(): string {
    return `${this.type.toUpperCase()} ${this.number}`;
  }

  get citation(): string {
    return `${this.displayName} - ${this.title}`;
  }

  // Helper methods
  incrementAccessCount(): void {
    this.accessCount++;
    this.lastAccessed = new Date();
  }

  updateRelevanceScore(score: number): void {
    this.relevanceScore = Math.max(0, Math.min(100, score));
  }

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

  addRelatedDocument(documentId: string): void {
    if (!this.relatedDocuments) {
      this.relatedDocuments = [];
    }
    if (!this.relatedDocuments.includes(documentId)) {
      this.relatedDocuments.push(documentId);
    }
  }

  removeRelatedDocument(documentId: string): void {
    if (this.relatedDocuments) {
      this.relatedDocuments = this.relatedDocuments.filter(id => id !== documentId);
    }
  }
}