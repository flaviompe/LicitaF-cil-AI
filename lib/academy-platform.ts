// Academia de Licitações Integrada - Plataforma completa de aprendizado
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  level: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO' | 'ESPECIALISTA';
  duration: number; // em minutos
  instructor: Instructor;
  modules: CourseModule[];
  price: number;
  isPremium: boolean;
  tags: string[];
  rating: number;
  studentsCount: number;
  certificateTemplate?: string;
  prerequisites: string[];
  learningObjectives: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type CourseCategory = 
  | 'FUNDAMENTOS_LICITACAO'
  | 'LEGISLACAO_ATUALIZADA'
  | 'PREGAO_ELETRONICO'
  | 'ANALISE_EDITAIS'
  | 'ELABORACAO_PROPOSTAS'
  | 'GESTAO_CONTRATOS'
  | 'COMPLIANCE_JURIDICO'
  | 'FINANCEIRO_TRIBUTARIO'
  | 'ESTRATEGIAS_VENDAS'
  | 'FERRAMENTAS_DIGITAIS'
  | 'CASOS_PRATICOS'
  | 'ESG_SUSTENTABILIDADE';

export interface Instructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  expertise: string[];
  avatar: string;
  certifications: string[];
  yearsExperience: number;
  rating: number;
  coursesCount: number;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number;
  lessons: Lesson[];
  quiz?: Quiz;
  assignment?: Assignment;
  isLocked: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'INTERACTIVE' | 'SIMULATION' | 'WEBINAR' | 'CASE_STUDY';
  content: LessonContent;
  duration: number;
  order: number;
  isCompleted: boolean;
  resources: Resource[];
  notes: string;
}

export interface LessonContent {
  videoUrl?: string;
  transcription?: string;
  textContent?: string;
  interactiveElements?: InteractiveElement[];
  downloadableMaterials?: string[];
  simulationConfig?: SimulationConfig;
}

export interface InteractiveElement {
  type: 'QUIZ_QUESTION' | 'CLICKABLE_DIAGRAM' | 'FORM_BUILDER' | 'CALCULATOR';
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface SimulationConfig {
  scenario: string;
  parameters: Record<string, any>;
  expectedOutcomes: string[];
  evaluationCriteria: string[];
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number; // em minutos
  attempts: number;
  isGraded: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_TEXT' | 'DRAG_DROP' | 'SCENARIO_BASED';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  difficulty: 'FACIL' | 'MEDIO' | 'DIFICIL';
  tags: string[];
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  deliverables: string[];
  dueDate?: Date;
  maxScore: number;
  rubric: AssignmentRubric[];
  submissionFormat: 'TEXT' | 'FILE' | 'URL' | 'PRESENTATION';
}

export interface AssignmentRubric {
  criteria: string;
  description: string;
  maxPoints: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  name: string;
  description: string;
  points: number;
}

export interface Resource {
  id: string;
  title: string;
  type: 'PDF' | 'TEMPLATE' | 'CHECKLIST' | 'CALCULATOR' | 'LINK' | 'TOOL';
  url: string;
  description: string;
  downloadCount: number;
  isPremium: boolean;
}

export interface StudentProgress {
  studentId: string;
  courseId: string;
  enrollmentDate: Date;
  completionPercentage: number;
  lastAccessDate: Date;
  totalTimeSpent: number; // em minutos
  modulesCompleted: string[];
  lessonsCompleted: string[];
  quizScores: Record<string, number>;
  assignmentGrades: Record<string, number>;
  certificateIssued?: Date;
  notes: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetAudience: string[];
  estimatedDuration: number; // em horas
  courses: Course[];
  prerequisites: string[];
  outcomes: string[];
  difficulty: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';
  price: number;
  discount: number;
}

export interface Webinar {
  id: string;
  title: string;
  description: string;
  instructor: Instructor;
  scheduledDate: Date;
  duration: number; // em minutos
  maxParticipants: number;
  currentParticipants: number;
  isLive: boolean;
  recordingUrl?: string;
  materials: Resource[];
  chat: WebinarMessage[];
  polls: WebinarPoll[];
  price: number;
  category: CourseCategory;
}

export interface WebinarMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  isInstructor: boolean;
}

export interface WebinarPoll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  isActive: boolean;
  createdAt: Date;
}

export interface Certificate {
  id: string;
  studentId: string;
  courseId: string;
  issuedDate: Date;
  certificateNumber: string;
  verificationUrl: string;
  template: string;
  credentialData: {
    studentName: string;
    courseName: string;
    completionDate: Date;
    grade?: number;
    instructorName: string;
    organizationName: string;
  };
}

export class AcademyPlatform {
  
  async createCourse(courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course> {
    try {
      const course = await prisma.course.create({
        data: {
          ...courseData,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          instructor: true,
          modules: {
            include: {
              lessons: true,
              quiz: true,
              assignment: true
            }
          }
        }
      });

      return course as Course;
    } catch (error) {
      throw new Error('Falha ao criar curso');
    }
  }

  async enrollStudent(studentId: string, courseId: string): Promise<StudentProgress> {
    try {
      // Verificar se o estudante já está matriculado
      const existingEnrollment = await prisma.studentProgress.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId
          }
        }
      });

      if (existingEnrollment) {
        throw new Error('Estudante já matriculado neste curso');
      }

      const enrollment = await prisma.studentProgress.create({
        data: {
          studentId,
          courseId,
          enrollmentDate: new Date(),
          completionPercentage: 0,
          lastAccessDate: new Date(),
          totalTimeSpent: 0,
          modulesCompleted: [],
          lessonsCompleted: [],
          quizScores: {},
          assignmentGrades: {},
          notes: ''
        }
      });

      return enrollment as StudentProgress;
    } catch (error) {
      throw new Error('Falha na matrícula do estudante');
    }
  }

  async updateLessonProgress(
    studentId: string, 
    courseId: string, 
    lessonId: string, 
    timeSpent: number
  ): Promise<void> {
    try {
      const progress = await prisma.studentProgress.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId
          }
        }
      });

      if (!progress) {
        throw new Error('Matrícula não encontrada');
      }

      const updatedLessons = [...progress.lessonsCompleted];
      if (!updatedLessons.includes(lessonId)) {
        updatedLessons.push(lessonId);
      }

      const newCompletionPercentage = await this.calculateCompletionPercentage(
        courseId, 
        updatedLessons
      );

      await prisma.studentProgress.update({
        where: {
          studentId_courseId: {
            studentId,
            courseId
          }
        },
        data: {
          lessonsCompleted: updatedLessons,
          totalTimeSpent: progress.totalTimeSpent + timeSpent,
          completionPercentage: newCompletionPercentage,
          lastAccessDate: new Date()
        }
      });

      // Emitir certificado se curso concluído
      if (newCompletionPercentage >= 100) {
        await this.issueCertificate(studentId, courseId);
      }

    } catch (error) {
      throw new Error('Falha ao atualizar progresso da aula');
    }
  }

  async submitQuizAttempt(
    studentId: string, 
    courseId: string, 
    quizId: string, 
    answers: Record<string, any>
  ): Promise<{ score: number; passed: boolean; feedback: QuizFeedback[] }> {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { questions: true }
      });

      if (!quiz) {
        throw new Error('Quiz não encontrado');
      }

      let totalScore = 0;
      let maxScore = 0;
      const feedback: QuizFeedback[] = [];

      for (const question of quiz.questions) {
        maxScore += question.points;
        const userAnswer = answers[question.id];
        const isCorrect = this.evaluateAnswer(question, userAnswer);
        
        if (isCorrect) {
          totalScore += question.points;
        }

        feedback.push({
          questionId: question.id,
          userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation,
          points: isCorrect ? question.points : 0
        });
      }

      const score = Math.round((totalScore / maxScore) * 100);
      const passed = score >= quiz.passingScore;

      // Salvar resultado
      await this.saveQuizResult(studentId, courseId, quizId, score, passed, feedback);

      return { score, passed, feedback };
    } catch (error) {
      throw new Error('Falha ao processar tentativa do quiz');
    }
  }

  private evaluateAnswer(question: QuizQuestion, userAnswer: any): boolean {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
      case 'TRUE_FALSE':
        return userAnswer === question.correctAnswer;
      
      case 'OPEN_TEXT':
        // Implementar análise de texto com IA para respostas abertas
        return this.evaluateOpenTextAnswer(question.correctAnswer as string, userAnswer);
      
      case 'DRAG_DROP':
        return JSON.stringify(userAnswer) === JSON.stringify(question.correctAnswer);
      
      case 'SCENARIO_BASED':
        return this.evaluateScenarioAnswer(question, userAnswer);
      
      default:
        return false;
    }
  }

  private evaluateOpenTextAnswer(correctAnswer: string, userAnswer: string): boolean {
    // Implementação simplificada - em produção usaria IA para análise semântica
    const keywords = correctAnswer.toLowerCase().split(' ');
    const userText = userAnswer.toLowerCase();
    
    const matchedKeywords = keywords.filter(keyword => userText.includes(keyword));
    return matchedKeywords.length >= keywords.length * 0.7; // 70% de similaridade
  }

  private evaluateScenarioAnswer(question: QuizQuestion, userAnswer: any): boolean {
    // Avaliar respostas baseadas em cenários complexos
    // Implementaria lógica específica baseada no tipo de cenário
    return true; // Placeholder
  }

  async createSimulation(simulationData: {
    title: string;
    scenario: string;
    difficulty: string;
    parameters: Record<string, any>;
  }): Promise<LicitationSimulation> {
    const simulation: LicitationSimulation = {
      id: `sim_${Date.now()}`,
      title: simulationData.title,
      scenario: simulationData.scenario,
      difficulty: simulationData.difficulty as any,
      parameters: simulationData.parameters,
      steps: this.generateSimulationSteps(simulationData.scenario),
      expectedOutcomes: [],
      evaluationCriteria: this.generateEvaluationCriteria(simulationData.scenario)
    };

    return simulation;
  }

  private generateSimulationSteps(scenario: string): SimulationStep[] {
    // Gerar etapas da simulação baseadas no cenário
    const baseSteps: SimulationStep[] = [
      {
        id: 'step_1',
        title: 'Análise do Edital',
        description: 'Analise o edital fornecido e identifique os pontos principais',
        type: 'ANALYSIS',
        data: {},
        validation: {
          required: true,
          criteria: ['Identificou objeto', 'Analisou exigências', 'Verificou prazos']
        }
      },
      {
        id: 'step_2', 
        title: 'Elaboração da Proposta',
        description: 'Elabore uma proposta técnica e comercial',
        type: 'PROPOSAL_CREATION',
        data: {},
        validation: {
          required: true,
          criteria: ['Proposta técnica completa', 'Preço competitivo', 'Documentação anexada']
        }
      },
      {
        id: 'step_3',
        title: 'Submissão e Acompanhamento',
        description: 'Submeta a proposta e acompanhe o processo',
        type: 'SUBMISSION',
        data: {},
        validation: {
          required: true,
          criteria: ['Proposta enviada no prazo', 'Acompanhou sessão', 'Documentos válidos']
        }
      }
    ];

    return baseSteps;
  }

  private generateEvaluationCriteria(scenario: string): string[] {
    return [
      'Completude da análise do edital',
      'Qualidade da proposta técnica',
      'Competitividade do preço',
      'Cumprimento de prazos',
      'Conformidade documental',
      'Estratégia de participação'
    ];
  }

  async scheduleWebinar(webinarData: Omit<Webinar, 'id' | 'currentParticipants' | 'isLive' | 'chat' | 'polls'>): Promise<Webinar> {
    try {
      const webinar = await prisma.webinar.create({
        data: {
          ...webinarData,
          currentParticipants: 0,
          isLive: false,
          chat: [],
          polls: []
        },
        include: {
          instructor: true,
          materials: true
        }
      });

      // Agendar notificações automáticas
      await this.scheduleWebinarNotifications(webinar.id, webinarData.scheduledDate);

      return webinar as Webinar;
    } catch (error) {
      throw new Error('Falha ao agendar webinar');
    }
  }

  private async scheduleWebinarNotifications(webinarId: string, scheduledDate: Date): Promise<void> {
    // Implementar sistema de notificações
    // - 1 semana antes
    // - 1 dia antes  
    // - 1 hora antes
    // - No momento do início
  }

  async generateLearningPath(userProfile: {
    experience: string;
    interests: string[];
    goals: string[];
    timeAvailable: number; // horas por semana
  }): Promise<LearningPath> {
    
    // IA para recomendar trilha personalizada
    const recommendedCourses = await this.recommendCoursesForProfile(userProfile);
    
    const learningPath: LearningPath = {
      id: `path_${Date.now()}`,
      title: `Trilha Personalizada - ${userProfile.experience}`,
      description: 'Trilha de aprendizado personalizada baseada no seu perfil',
      targetAudience: [userProfile.experience],
      estimatedDuration: this.calculatePathDuration(recommendedCourses),
      courses: recommendedCourses,
      prerequisites: this.extractPrerequisites(recommendedCourses),
      outcomes: this.generateLearningOutcomes(userProfile.goals),
      difficulty: this.determineDifficulty(userProfile.experience),
      price: this.calculateBundlePrice(recommendedCourses),
      discount: this.calculateBundleDiscount(recommendedCourses.length)
    };

    return learningPath;
  }

  private async recommendCoursesForProfile(profile: any): Promise<Course[]> {
    // Algoritmo de recomendação baseado em perfil
    const allCourses = await prisma.course.findMany({
      include: {
        instructor: true,
        modules: true
      }
    });

    // Filtrar e ordenar por relevância
    return allCourses
      .filter(course => this.matchesUserProfile(course, profile))
      .sort((a, b) => this.calculateRelevanceScore(b, profile) - this.calculateRelevanceScore(a, profile))
      .slice(0, 8); // Máximo 8 cursos por trilha
  }

  private matchesUserProfile(course: Course, profile: any): boolean {
    // Verificar compatibilidade com nível de experiência
    const experienceLevels = {
      'iniciante': ['INICIANTE'],
      'intermediario': ['INICIANTE', 'INTERMEDIARIO'],
      'avancado': ['INTERMEDIARIO', 'AVANCADO'],
      'especialista': ['AVANCADO', 'ESPECIALISTA']
    };

    return experienceLevels[profile.experience.toLowerCase()]?.includes(course.level) || false;
  }

  private calculateRelevanceScore(course: Course, profile: any): number {
    let score = 0;
    
    // Pontuação por interesse
    const courseInterests = course.tags.concat([course.category]);
    const matchingInterests = courseInterests.filter(tag => 
      profile.interests.some((interest: string) => 
        tag.toLowerCase().includes(interest.toLowerCase())
      )
    );
    score += matchingInterests.length * 10;
    
    // Pontuação por rating
    score += course.rating * 2;
    
    // Pontuação por popularidade
    score += Math.log(course.studentsCount + 1);
    
    return score;
  }

  async issueCertificate(studentId: string, courseId: string): Promise<Certificate> {
    try {
      const student = await prisma.user.findUnique({ where: { id: studentId } });
      const course = await prisma.course.findUnique({ 
        where: { id: courseId },
        include: { instructor: true }
      });

      if (!student || !course) {
        throw new Error('Estudante ou curso não encontrado');
      }

      const certificateNumber = this.generateCertificateNumber();
      const verificationUrl = `${process.env.APP_URL}/certificates/verify/${certificateNumber}`;

      const certificate: Certificate = {
        id: `cert_${Date.now()}`,
        studentId,
        courseId,
        issuedDate: new Date(),
        certificateNumber,
        verificationUrl,
        template: 'default',
        credentialData: {
          studentName: student.name,
          courseName: course.title,
          completionDate: new Date(),
          instructorName: course.instructor.name,
          organizationName: 'LicitaFácil Pro Academy'
        }
      };

      await prisma.certificate.create({
        data: certificate
      });

      // Enviar por email
      await this.sendCertificateEmail(student.email, certificate);

      return certificate;
    } catch (error) {
      throw new Error('Falha ao emitir certificado');
    }
  }

  private generateCertificateNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `LFP-${timestamp}-${random}`.toUpperCase();
  }

  private async sendCertificateEmail(email: string, certificate: Certificate): Promise<void> {
    // Implementar envio de email com certificado
  }

  private async calculateCompletionPercentage(courseId: string, completedLessons: string[]): Promise<number> {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true
          }
        }
      }
    });

    if (!course) return 0;

    const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);
    
    if (totalLessons === 0) return 0;
    
    return Math.round((completedLessons.length / totalLessons) * 100);
  }

  private async saveQuizResult(
    studentId: string, 
    courseId: string, 
    quizId: string, 
    score: number, 
    passed: boolean, 
    feedback: QuizFeedback[]
  ): Promise<void> {
    // Salvar resultado do quiz no progresso do estudante
    const progress = await prisma.studentProgress.findUnique({
      where: {
        studentId_courseId: { studentId, courseId }
      }
    });

    if (progress) {
      const updatedScores = { ...progress.quizScores, [quizId]: score };
      
      await prisma.studentProgress.update({
        where: {
          studentId_courseId: { studentId, courseId }
        },
        data: {
          quizScores: updatedScores
        }
      });
    }
  }

  private calculatePathDuration(courses: Course[]): number {
    return courses.reduce((total, course) => total + course.duration, 0) / 60; // em horas
  }

  private extractPrerequisites(courses: Course[]): string[] {
    const allPrerequisites = courses.flatMap(course => course.prerequisites);
    return [...new Set(allPrerequisites)]; // remover duplicatas
  }

  private generateLearningOutcomes(goals: string[]): string[] {
    return goals.map(goal => `Dominar ${goal} em licitações públicas`);
  }

  private determineDifficulty(experience: string): 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO' {
    const difficultyMap: Record<string, 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'> = {
      'iniciante': 'INICIANTE',
      'intermediario': 'INTERMEDIARIO',
      'avancado': 'AVANCADO',
      'especialista': 'AVANCADO'
    };
    
    return difficultyMap[experience.toLowerCase()] || 'INICIANTE';
  }

  private calculateBundlePrice(courses: Course[]): number {
    return courses.reduce((total, course) => total + course.price, 0);
  }

  private calculateBundleDiscount(courseCount: number): number {
    // Desconto progressivo por número de cursos
    if (courseCount >= 6) return 30;
    if (courseCount >= 4) return 20;
    if (courseCount >= 2) return 10;
    return 0;
  }
}

// Interfaces auxiliares
export interface QuizFeedback {
  questionId: string;
  userAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
  explanation: string;
  points: number;
}

export interface LicitationSimulation {
  id: string;
  title: string;
  scenario: string;
  difficulty: 'FACIL' | 'MEDIO' | 'DIFICIL' | 'EXPERT';
  parameters: Record<string, any>;
  steps: SimulationStep[];
  expectedOutcomes: string[];
  evaluationCriteria: string[];
}

export interface SimulationStep {
  id: string;
  title: string;
  description: string;
  type: 'ANALYSIS' | 'PROPOSAL_CREATION' | 'SUBMISSION' | 'NEGOTIATION' | 'EVALUATION';
  data: Record<string, any>;
  validation: {
    required: boolean;
    criteria: string[];
  };
}

// Instância singleton
export const academyPlatform = new AcademyPlatform();