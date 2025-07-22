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

export enum AnalysisType {
  EDITAL_COMPLIANCE = 'edital_compliance',
  RISK_ASSESSMENT = 'risk_assessment',
  DOCUMENT_VALIDATION = 'document_validation',
  DEADLINE_ANALYSIS = 'deadline_analysis',
  LEGAL_REVIEW = 'legal_review',
  COMPETITIVE_ANALYSIS = 'competitive_analysis',
  REQUIREMENT_CHECK = 'requirement_check',
}

export enum AnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('legal_analyses')
export class LegalAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AnalysisType,
    default: AnalysisType.EDITAL_COMPLIANCE,
  })
  @Index('idx_legal_analysis_type')
  type: AnalysisType;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.PENDING,
  })
  @Index('idx_legal_analysis_status')
  status: AnalysisStatus;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    default: RiskLevel.LOW,
  })
  @Index('idx_legal_analysis_risk_level')
  riskLevel: RiskLevel;

  @Column({ name: 'input_data', type: 'json' })
  inputData: {
    editalUrl?: string;
    editalText?: string;
    documentType?: string;
    opportunityId?: string;
    companyProfile?: {
      size: string;
      sector: string;
      location: string;
      certifications: string[];
    };
    proposalData?: any;
    deadlines?: {
      submission: Date;
      clarification: Date;
      technical: Date;
      commercial: Date;
    };
  };

  @Column({ name: 'analysis_results', type: 'json', nullable: true })
  analysisResults: {
    overallScore: number;
    complianceScore: number;
    riskScore: number;
    eligibilityScore: number;
    competitivenessScore: number;
    
    findings: {
      type: 'compliance' | 'risk' | 'opportunity' | 'requirement';
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      recommendation: string;
      legalBasis: string;
      article?: string;
      deadline?: Date;
      impact: string;
    }[];
    
    compliance: {
      requiredDocuments: {
        document: string;
        required: boolean;
        available: boolean;
        expirationDate?: Date;
        notes?: string;
      }[];
      
      eligibilityCriteria: {
        criterion: string;
        met: boolean;
        evidence?: string;
        notes?: string;
      }[];
      
      technicalRequirements: {
        requirement: string;
        met: boolean;
        evidence?: string;
        notes?: string;
      }[];
    };
    
    risks: {
      financialRisks: {
        risk: string;
        probability: number;
        impact: number;
        mitigation: string;
      }[];
      
      legalRisks: {
        risk: string;
        probability: number;
        impact: number;
        mitigation: string;
        legalBasis: string;
      }[];
      
      operationalRisks: {
        risk: string;
        probability: number;
        impact: number;
        mitigation: string;
      }[];
    };
    
    opportunities: {
      opportunity: string;
      potential: number;
      strategy: string;
      legalBasis?: string;
    }[];
    
    deadlines: {
      deadline: string;
      date: Date;
      type: 'submission' | 'clarification' | 'technical' | 'commercial' | 'other';
      critical: boolean;
      daysUntil: number;
      actions: string[];
    }[];
    
    recommendations: {
      priority: 'high' | 'medium' | 'low';
      action: string;
      justification: string;
      timeline: string;
      resources: string[];
    }[];
  };

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number;

  @Column({ name: 'processing_time', nullable: true })
  processingTime: number;

  @Column({ name: 'ai_model_used', nullable: true })
  aiModelUsed: string;

  @Column({ name: 'legal_references', type: 'json', nullable: true })
  legalReferences: {
    documentId: string;
    documentNumber: string;
    title: string;
    article?: string;
    paragraph?: string;
    relevance: number;
    excerpt?: string;
    url?: string;
  }[];

  @Column({ name: 'warnings', type: 'json', nullable: true })
  warnings: {
    type: 'deadline' | 'compliance' | 'risk' | 'requirement' | 'document';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    deadline?: Date;
    actionRequired: string;
    legalBasis?: string;
  }[];

  @Column({ name: 'follow_up_actions', type: 'json', nullable: true })
  followUpActions: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: Date;
    assignedTo?: string;
    status: 'pending' | 'in_progress' | 'completed';
    notes?: string;
  }[];

  @Column({ name: 'executive_summary', type: 'text', nullable: true })
  executiveSummary: string;

  @Column({ name: 'detailed_report', type: 'text', nullable: true })
  detailedReport: string;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  // Relationships
  @ManyToOne(() => User, user => user.legalAnalyses)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_legal_analysis_created_at')
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual Properties
  get isPending(): boolean {
    return this.status === AnalysisStatus.PENDING;
  }

  get isProcessing(): boolean {
    return this.status === AnalysisStatus.PROCESSING;
  }

  get isCompleted(): boolean {
    return this.status === AnalysisStatus.COMPLETED;
  }

  get hasFailed(): boolean {
    return this.status === AnalysisStatus.FAILED;
  }

  get isExpired(): boolean {
    return this.status === AnalysisStatus.EXPIRED || 
           (this.expiresAt && this.expiresAt < new Date());
  }

  get hasHighRisk(): boolean {
    return this.riskLevel === RiskLevel.HIGH || this.riskLevel === RiskLevel.CRITICAL;
  }

  get isCritical(): boolean {
    return this.riskLevel === RiskLevel.CRITICAL;
  }

  get hasWarnings(): boolean {
    return this.warnings && this.warnings.length > 0;
  }

  get criticalWarnings(): typeof this.warnings {
    return this.warnings?.filter(w => w.severity === 'critical') || [];
  }

  get highPriorityWarnings(): typeof this.warnings {
    return this.warnings?.filter(w => w.severity === 'high') || [];
  }

  get overallScore(): number {
    return this.analysisResults?.overallScore || 0;
  }

  get complianceScore(): number {
    return this.analysisResults?.complianceScore || 0;
  }

  get riskScore(): number {
    return this.analysisResults?.riskScore || 0;
  }

  get hasHighConfidence(): boolean {
    return this.confidenceScore !== null && this.confidenceScore >= 0.8;
  }

  // Helper methods
  setProcessingStarted(): void {
    this.status = AnalysisStatus.PROCESSING;
    this.startedAt = new Date();
  }

  setCompleted(results: typeof this.analysisResults, confidenceScore: number): void {
    this.status = AnalysisStatus.COMPLETED;
    this.analysisResults = results;
    this.confidenceScore = confidenceScore;
    this.completedAt = new Date();
    
    if (this.startedAt) {
      this.processingTime = this.completedAt.getTime() - this.startedAt.getTime();
    }
    
    // Determine risk level based on results
    if (results?.riskScore >= 80) {
      this.riskLevel = RiskLevel.CRITICAL;
    } else if (results?.riskScore >= 60) {
      this.riskLevel = RiskLevel.HIGH;
    } else if (results?.riskScore >= 40) {
      this.riskLevel = RiskLevel.MEDIUM;
    } else {
      this.riskLevel = RiskLevel.LOW;
    }
  }

  setFailed(errorMessage: string): void {
    this.status = AnalysisStatus.FAILED;
    this.errorMessage = errorMessage;
    this.completedAt = new Date();
    
    if (this.startedAt) {
      this.processingTime = this.completedAt.getTime() - this.startedAt.getTime();
    }
  }

  setExpired(): void {
    this.status = AnalysisStatus.EXPIRED;
  }

  addWarning(warning: typeof this.warnings[0]): void {
    if (!this.warnings) {
      this.warnings = [];
    }
    this.warnings.push(warning);
  }

  addLegalReference(reference: typeof this.legalReferences[0]): void {
    if (!this.legalReferences) {
      this.legalReferences = [];
    }
    this.legalReferences.push(reference);
  }

  addFollowUpAction(action: typeof this.followUpActions[0]): void {
    if (!this.followUpActions) {
      this.followUpActions = [];
    }
    this.followUpActions.push(action);
  }

  updateFollowUpAction(index: number, updates: Partial<typeof this.followUpActions[0]>): void {
    if (this.followUpActions && this.followUpActions[index]) {
      this.followUpActions[index] = { ...this.followUpActions[index], ...updates };
    }
  }

  archive(): void {
    this.isArchived = true;
  }

  setExpirationDate(days: number): void {
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}