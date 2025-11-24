/**
 * HealthOS Onboarding Module
 *
 * Modulo completo para onboarding de todos os tipos de atores:
 * - Patients: Cadastro, consentimento, setup de seguranca
 * - Entities: Cadastro, verificacao de credenciais, vinculacao
 * - Services: Cadastro, configuracao, habilitacao de stages
 *
 * O onboarding segue uma maquina de estados para garantir
 * que todas as etapas sao completadas corretamente.
 */

import type {
  ActorId,
  StageId,
  PersonaId,
  EntityRole,
  ServiceType,
} from '@healthos/shared';

// =============================================================================
// TYPES
// =============================================================================

export type OnboardingType = 'patient' | 'entity' | 'service';

export type OnboardingStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_verification'
  | 'completed'
  | 'failed'
  | 'suspended';

export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  completedAt?: Date;
  data?: Record<string, unknown>;
  errors?: string[];
}

export interface OnboardingSession {
  id: string;
  type: OnboardingType;
  actorId?: ActorId;
  status: OnboardingStatus;
  currentStepId: string;
  steps: OnboardingStep[];
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

// =============================================================================
// PATIENT ONBOARDING
// =============================================================================

export interface PatientOnboardingData {
  // Step 1: Identity
  identity?: {
    fullName: string;
    cpf?: string;
    birthDate: Date;
    phone: string;
    email?: string;
  };

  // Step 2: Demographics
  demographics?: {
    gender: 'male' | 'female' | 'other' | 'not_informed';
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };

  // Step 3: Consent
  consent?: {
    termsAccepted: boolean;
    termsVersion: string;
    privacyAccepted: boolean;
    privacyVersion: string;
    dataProcessingAccepted: boolean;
    marketingOptIn: boolean;
    researchOptIn: boolean;
    acceptedAt: Date;
  };

  // Step 4: Security
  security?: {
    passwordSet: boolean;
    mfaEnabled: boolean;
    mfaMethod?: 'sms' | 'email' | 'authenticator';
    recoverySetup: boolean;
    recoveryMethod?: 'email' | 'phone' | 'security_questions';
    biometricEnabled?: boolean;
  };

  // Step 5: Preferences
  preferences?: {
    language: string;
    notifications: {
      sms: boolean;
      email: boolean;
      push: boolean;
      whatsapp: boolean;
    };
    emergencyAccess: boolean;
  };
}

export const PATIENT_ONBOARDING_STEPS: Omit<OnboardingStep, 'status' | 'completedAt' | 'data' | 'errors'>[] = [
  {
    id: 'identity',
    name: 'Identificacao',
    description: 'Dados basicos de identificacao',
    required: true,
    order: 1,
  },
  {
    id: 'demographics',
    name: 'Dados Demograficos',
    description: 'Endereco e contato de emergencia',
    required: false,
    order: 2,
  },
  {
    id: 'consent',
    name: 'Consentimento',
    description: 'Termos de uso e politica de privacidade',
    required: true,
    order: 3,
  },
  {
    id: 'security',
    name: 'Seguranca',
    description: 'Configuracao de senha e autenticacao',
    required: true,
    order: 4,
  },
  {
    id: 'preferences',
    name: 'Preferencias',
    description: 'Notificacoes e preferencias gerais',
    required: false,
    order: 5,
  },
];

// =============================================================================
// ENTITY ONBOARDING
// =============================================================================

export interface EntityOnboardingData {
  // Step 1: Identity
  identity?: {
    fullName: string;
    cpf: string;
    birthDate: Date;
    phone: string;
    email: string;
  };

  // Step 2: Professional
  professional?: {
    role: EntityRole;
    credentials: Array<{
      type: string;
      number: string;
      state: string;
      specialty?: string;
      validUntil?: Date;
    }>;
    specialties: string[];
    yearsOfExperience?: number;
  };

  // Step 3: Verification
  verification?: {
    documentUploaded: boolean;
    documentType: 'rg' | 'cnh' | 'passport';
    credentialVerified: boolean;
    verificationMethod: 'manual' | 'api';
    verifiedAt?: Date;
    verifiedBy?: string;
  };

  // Step 4: Service Link
  serviceLink?: {
    linkedServices: ActorId[];
    pendingInvites: string[];
    primaryServiceId?: ActorId;
  };

  // Step 5: Security
  security?: {
    passwordSet: boolean;
    mfaEnabled: boolean;
    mfaMethod?: 'sms' | 'email' | 'authenticator';
    digitalCertificate?: {
      type: 'icp-brasil' | 'other';
      issuer: string;
      validUntil: Date;
    };
  };

  // Step 6: Preferences
  preferences?: {
    language: string;
    defaultStageId?: StageId;
    defaultPersonaId?: PersonaId;
    notifications: {
      newPatient: boolean;
      urgentCases: boolean;
      scheduleChanges: boolean;
    };
    uiTheme: 'light' | 'dark' | 'system';
  };
}

export const ENTITY_ONBOARDING_STEPS: Omit<OnboardingStep, 'status' | 'completedAt' | 'data' | 'errors'>[] = [
  {
    id: 'identity',
    name: 'Identificacao',
    description: 'Dados pessoais do profissional',
    required: true,
    order: 1,
  },
  {
    id: 'professional',
    name: 'Dados Profissionais',
    description: 'Registro profissional e especialidades',
    required: true,
    order: 2,
  },
  {
    id: 'verification',
    name: 'Verificacao',
    description: 'Verificacao de documentos e credenciais',
    required: true,
    order: 3,
  },
  {
    id: 'service_link',
    name: 'Vinculacao',
    description: 'Vinculacao a unidades de saude',
    required: true,
    order: 4,
  },
  {
    id: 'security',
    name: 'Seguranca',
    description: 'Senha, MFA e certificado digital',
    required: true,
    order: 5,
  },
  {
    id: 'preferences',
    name: 'Preferencias',
    description: 'Configuracoes e preferencias',
    required: false,
    order: 6,
  },
];

// =============================================================================
// SERVICE ONBOARDING
// =============================================================================

export interface ServiceOnboardingData {
  // Step 1: Identity
  identity?: {
    name: string;
    cnpj: string;
    cnes?: string;
    serviceType: ServiceType;
    responsibleName: string;
    responsibleCpf: string;
    phone: string;
    email: string;
  };

  // Step 2: Location
  location?: {
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    timezone: string;
  };

  // Step 3: Configuration
  configuration?: {
    operatingHours: Array<{
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
    }>;
    capacity: {
      maxConcurrentPatients: number;
      maxDailyConsultations?: number;
    };
    specialties: string[];
  };

  // Step 4: Legal
  legal?: {
    licenseNumber?: string;
    licenseValidUntil?: Date;
    sanitaryLicense?: string;
    termsAccepted: boolean;
    termsVersion: string;
    dataProcessingAgreement: boolean;
    privacyOfficer?: {
      name: string;
      email: string;
      phone: string;
    };
  };

  // Step 5: Stages
  stages?: {
    enabledStages: StageId[];
    stageConfigs: Record<StageId, Record<string, unknown>>;
  };

  // Step 6: Admin Setup
  adminSetup?: {
    adminEntities: ActorId[];
    invitedEmails: string[];
    rolesConfigured: boolean;
  };
}

export const SERVICE_ONBOARDING_STEPS: Omit<OnboardingStep, 'status' | 'completedAt' | 'data' | 'errors'>[] = [
  {
    id: 'identity',
    name: 'Identificacao',
    description: 'Dados da unidade de saude',
    required: true,
    order: 1,
  },
  {
    id: 'location',
    name: 'Localizacao',
    description: 'Endereco e localizacao',
    required: true,
    order: 2,
  },
  {
    id: 'configuration',
    name: 'Configuracao',
    description: 'Horarios e capacidade',
    required: true,
    order: 3,
  },
  {
    id: 'legal',
    name: 'Documentacao Legal',
    description: 'Licencas e termos',
    required: true,
    order: 4,
  },
  {
    id: 'stages',
    name: 'Stages',
    description: 'Habilitacao de ambientes',
    required: true,
    order: 5,
  },
  {
    id: 'admin_setup',
    name: 'Administradores',
    description: 'Configuracao de administradores',
    required: true,
    order: 6,
  },
];

// =============================================================================
// ONBOARDING MANAGER
// =============================================================================

/**
 * OnboardingManager - Gerencia o processo de onboarding
 */
export class OnboardingManager {
  private sessions: Map<string, OnboardingSession>;

  constructor() {
    this.sessions = new Map();
  }

  /**
   * Inicia um novo processo de onboarding
   */
  startOnboarding(type: OnboardingType): OnboardingSession {
    const sessionId = crypto.randomUUID();
    const steps = this.getStepsForType(type);

    const session: OnboardingSession = {
      id: sessionId,
      type,
      status: 'in_progress',
      currentStepId: steps[0].id,
      steps: steps.map((s) => ({ ...s, status: 'pending' as const })),
      startedAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    session.steps[0].status = 'in_progress';
    this.sessions.set(sessionId, session);

    return session;
  }

  /**
   * Obtem sessao de onboarding
   */
  getSession(sessionId: string): OnboardingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Completa um step do onboarding
   */
  completeStep(
    sessionId: string,
    stepId: string,
    data: Record<string, unknown>
  ): { success: boolean; nextStep?: string; errors?: string[] } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, errors: ['Session not found'] };
    }

    const stepIndex = session.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      return { success: false, errors: ['Step not found'] };
    }

    const step = session.steps[stepIndex];

    // Valida os dados do step
    const validation = this.validateStepData(session.type, stepId, data);
    if (!validation.valid) {
      step.errors = validation.errors;
      return { success: false, errors: validation.errors };
    }

    // Marca step como completo
    step.status = 'completed';
    step.completedAt = new Date();
    step.data = data;
    step.errors = undefined;

    // Avanca para proximo step
    const nextStepIndex = stepIndex + 1;
    if (nextStepIndex < session.steps.length) {
      session.steps[nextStepIndex].status = 'in_progress';
      session.currentStepId = session.steps[nextStepIndex].id;
      session.updatedAt = new Date();
      return { success: true, nextStep: session.steps[nextStepIndex].id };
    }

    // Onboarding completo
    session.status = 'completed';
    session.completedAt = new Date();
    session.updatedAt = new Date();

    return { success: true };
  }

  /**
   * Pula um step opcional
   */
  skipStep(sessionId: string, stepId: string): { success: boolean; errors?: string[] } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, errors: ['Session not found'] };
    }

    const stepIndex = session.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      return { success: false, errors: ['Step not found'] };
    }

    const step = session.steps[stepIndex];
    if (step.required) {
      return { success: false, errors: ['Cannot skip required step'] };
    }

    step.status = 'skipped';
    step.completedAt = new Date();

    // Avanca para proximo step
    const nextStepIndex = stepIndex + 1;
    if (nextStepIndex < session.steps.length) {
      session.steps[nextStepIndex].status = 'in_progress';
      session.currentStepId = session.steps[nextStepIndex].id;
    } else {
      session.status = 'completed';
      session.completedAt = new Date();
    }

    session.updatedAt = new Date();
    return { success: true };
  }

  /**
   * Volta para um step anterior
   */
  goToStep(sessionId: string, stepId: string): { success: boolean; errors?: string[] } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, errors: ['Session not found'] };
    }

    const stepIndex = session.steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      return { success: false, errors: ['Step not found'] };
    }

    // Marca step atual como pending novamente
    const currentIndex = session.steps.findIndex((s) => s.id === session.currentStepId);
    if (currentIndex > stepIndex) {
      session.steps[currentIndex].status = 'pending';
    }

    // Vai para o step solicitado
    session.steps[stepIndex].status = 'in_progress';
    session.currentStepId = stepId;
    session.updatedAt = new Date();

    return { success: true };
  }

  /**
   * Finaliza o onboarding e cria o Actor
   */
  async finalizeOnboarding(
    sessionId: string,
    castInstance: any // Cast instance
  ): Promise<{ success: boolean; actorId?: ActorId; errors?: string[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, errors: ['Session not found'] };
    }

    // Verifica se todos os steps obrigatorios foram completados
    const incompleteRequired = session.steps.filter(
      (s) => s.required && s.status !== 'completed'
    );
    if (incompleteRequired.length > 0) {
      return {
        success: false,
        errors: [`Steps obrigatorios incompletos: ${incompleteRequired.map((s) => s.name).join(', ')}`],
      };
    }

    try {
      // Cria o Actor baseado no tipo
      let actorId: ActorId;

      switch (session.type) {
        case 'patient':
          actorId = await this.createPatientActor(session, castInstance);
          break;
        case 'entity':
          actorId = await this.createEntityActor(session, castInstance);
          break;
        case 'service':
          actorId = await this.createServiceActor(session, castInstance);
          break;
        default:
          return { success: false, errors: ['Invalid onboarding type'] };
      }

      session.actorId = actorId;
      session.status = 'completed';
      session.completedAt = new Date();
      session.updatedAt = new Date();

      return { success: true, actorId };
    } catch (error) {
      session.status = 'failed';
      session.updatedAt = new Date();
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private getStepsForType(type: OnboardingType): typeof PATIENT_ONBOARDING_STEPS {
    switch (type) {
      case 'patient':
        return PATIENT_ONBOARDING_STEPS;
      case 'entity':
        return ENTITY_ONBOARDING_STEPS;
      case 'service':
        return SERVICE_ONBOARDING_STEPS;
      default:
        throw new Error(`Unknown onboarding type: ${type}`);
    }
  }

  private validateStepData(
    type: OnboardingType,
    stepId: string,
    data: Record<string, unknown>
  ): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validacoes especificas por tipo e step
    switch (type) {
      case 'patient':
        if (stepId === 'identity') {
          if (!data.fullName) errors.push('Nome completo e obrigatorio');
          if (!data.phone) errors.push('Telefone e obrigatorio');
          if (!data.birthDate) errors.push('Data de nascimento e obrigatoria');
        }
        if (stepId === 'consent') {
          if (!data.termsAccepted) errors.push('Aceite dos termos e obrigatorio');
          if (!data.privacyAccepted) errors.push('Aceite da politica de privacidade e obrigatorio');
        }
        if (stepId === 'security') {
          if (!data.passwordSet) errors.push('Configuracao de senha e obrigatoria');
        }
        break;

      case 'entity':
        if (stepId === 'identity') {
          if (!data.fullName) errors.push('Nome completo e obrigatorio');
          if (!data.cpf) errors.push('CPF e obrigatorio');
          if (!data.email) errors.push('Email e obrigatorio');
        }
        if (stepId === 'professional') {
          if (!data.role) errors.push('Funcao profissional e obrigatoria');
          if (!data.credentials || (data.credentials as any[]).length === 0) {
            errors.push('Ao menos uma credencial e obrigatoria');
          }
        }
        if (stepId === 'verification') {
          if (!data.documentUploaded) errors.push('Upload de documento e obrigatorio');
        }
        if (stepId === 'service_link') {
          if (!data.linkedServices || (data.linkedServices as any[]).length === 0) {
            errors.push('Vinculacao a ao menos uma unidade e obrigatoria');
          }
        }
        break;

      case 'service':
        if (stepId === 'identity') {
          if (!data.name) errors.push('Nome da unidade e obrigatorio');
          if (!data.cnpj) errors.push('CNPJ e obrigatorio');
          if (!data.serviceType) errors.push('Tipo de servico e obrigatorio');
        }
        if (stepId === 'location') {
          if (!data.address) errors.push('Endereco e obrigatorio');
        }
        if (stepId === 'legal') {
          if (!data.termsAccepted) errors.push('Aceite dos termos e obrigatorio');
        }
        if (stepId === 'stages') {
          if (!data.enabledStages || (data.enabledStages as any[]).length === 0) {
            errors.push('Ao menos um Stage deve ser habilitado');
          }
        }
        break;
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private async createPatientActor(session: OnboardingSession, cast: any): Promise<ActorId> {
    const identityData = session.steps.find((s) => s.id === 'identity')?.data;
    const securityData = session.steps.find((s) => s.id === 'security')?.data;

    // Gera ID unico para o paciente
    const patientId = `patient_${crypto.randomUUID()}` as ActorId;

    // Gera par de chaves para o paciente
    const { publicKey, encryptedPrivateKey } = await this.generateKeyPair(
      securityData?.password as string
    );

    // Cria o PatientActor
    await cast.createPatientActor(patientId, publicKey, encryptedPrivateKey);

    return patientId;
  }

  private async createEntityActor(session: OnboardingSession, cast: any): Promise<ActorId> {
    const identityData = session.steps.find((s) => s.id === 'identity')?.data;
    const professionalData = session.steps.find((s) => s.id === 'professional')?.data;
    const serviceLinkData = session.steps.find((s) => s.id === 'service_link')?.data;

    const entityId = `entity_${crypto.randomUUID()}` as ActorId;

    await cast.createEntityActor(
      entityId,
      professionalData?.role as string,
      professionalData?.credentials as any[]
    );

    // Vincula aos services
    const linkedServices = (serviceLinkData?.linkedServices as ActorId[]) || [];
    for (const serviceId of linkedServices) {
      const entityActor = await cast.getEntityActor(entityId);
      await entityActor.linkToService(serviceId);

      const serviceActor = await cast.getServiceActor(serviceId);
      await serviceActor.linkEntity(entityId);
    }

    return entityId;
  }

  private async createServiceActor(session: OnboardingSession, cast: any): Promise<ActorId> {
    const identityData = session.steps.find((s) => s.id === 'identity')?.data;
    const locationData = session.steps.find((s) => s.id === 'location')?.data;
    const stagesData = session.steps.find((s) => s.id === 'stages')?.data;

    const serviceId = `service_${crypto.randomUUID()}` as ActorId;

    await cast.createServiceActor(serviceId, {
      name: identityData?.name as string,
      serviceType: identityData?.serviceType as string,
      cnes: identityData?.cnes as string,
      location: locationData?.address,
    });

    // Habilita stages
    const serviceActor = await cast.getServiceActor(serviceId);
    const enabledStages = (stagesData?.enabledStages as StageId[]) || [];
    for (const stageId of enabledStages) {
      await serviceActor.enableStage(stageId);
    }

    return serviceId;
  }

  private async generateKeyPair(password: string): Promise<{
    publicKey: string;
    encryptedPrivateKey: any;
  }> {
    // Em producao, usaria WebCrypto para gerar par de chaves RSA
    // e criptografar a chave privada com AES derivado da senha

    // Placeholder
    return {
      publicKey: `public_${crypto.randomUUID()}`,
      encryptedPrivateKey: {
        ciphertext: 'encrypted_private_key',
        iv: crypto.randomUUID(),
        algorithm: 'AES-GCM-256',
        keyId: 'derived_from_password',
      },
    };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { OnboardingManager };
