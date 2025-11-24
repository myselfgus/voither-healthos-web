/**
 * HealthOS Validation Schemas
 *
 * Schemas Zod para validacao de todos os tipos do sistema.
 * Usados tanto em runtime quanto em compile-time.
 */

import { z } from 'zod';

// =============================================================================
// IDENTIFICADORES
// =============================================================================

export const ActorIdSchema = z.string().brand<'ActorId'>();
export const StageIdSchema = z.string().brand<'StageId'>();
export const PersonaIdSchema = z.string().brand<'PersonaId'>();
export const ToolIdSchema = z.string().brand<'ToolId'>();
export const ScriptIdSchema = z.string().brand<'ScriptId'>();
export const SessionIdSchema = z.string().brand<'SessionId'>();
export const GrantIdSchema = z.string().uuid();

// =============================================================================
// ENUMS
// =============================================================================

export const ActorTypeSchema = z.enum(['patient', 'entity', 'service', 'prop']);
export const EntityRoleSchema = z.enum([
  'physician',
  'nurse',
  'psychologist',
  'admin',
  'regulator',
  'pharmacist',
  'lab_technician',
  'dentist',
  'physiotherapist',
  'nutritionist',
  'social_worker',
]);

export const ServiceTypeSchema = z.enum([
  'clinic',
  'hospital',
  'ubs',
  'upa',
  'laboratory',
  'pharmacy',
  'regulation_center',
  'caps',
  'samu',
  'home_care',
]);

export const PropCategorySchema = z.enum([
  'capability',
  'integration',
  'knowledge',
  'automation',
]);

export const DataTypeSchema = z.enum([
  'demographics',
  'medical_history',
  'consultations',
  'prescriptions',
  'exams',
  'mental_health',
  'all',
]);

export const AccessActionSchema = z.enum(['read', 'write', 'append', 'share']);

export const AutomationLevelSchema = z.enum([
  'auto_execute',
  'auto_with_notification',
  'require_validation',
  'require_signature',
]);

export const TriggerTypeSchema = z.enum([
  'manual',
  'auto',
  'event',
  'schedule',
  'condition',
]);

export const GuardrailTypeSchema = z.enum([
  'never_prescribe',
  'require_validation',
  'no_pii_in_logs',
  'max_retries',
  'timeout',
  'scope_limit',
  'rate_limit',
  'cost_limit',
  'custom',
]);

export const LLMModelSchema = z.enum([
  'claude-sonnet-4-20250514',
  'claude-haiku',
  'claude-opus',
  'gpt-4o',
  'gpt-4o-mini',
  'gemini-pro',
]);

// =============================================================================
// SEGURANCA E ACESSO
// =============================================================================

export const AccessScopeSchema = z.object({
  dataTypes: z.array(DataTypeSchema),
  actions: z.array(AccessActionSchema),
  durationSeconds: z.number().min(60).max(86400), // 1 min to 24 hours
  reason: z.string().min(10).max(500),
});

export const AccessGrantSchema = z.object({
  id: GrantIdSchema,
  patientActorId: ActorIdSchema,
  entityActorId: ActorIdSchema,
  serviceActorId: ActorIdSchema,
  scope: AccessScopeSchema,
  grantedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  sessionKey: z.string(),
  revokedAt: z.coerce.date().optional(),
  revokedReason: z.string().optional(),
});

export const AuditEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.coerce.date(),
  actorId: ActorIdSchema,
  targetActorId: ActorIdSchema,
  action: z.string(),
  scope: AccessScopeSchema,
  serviceActorId: ActorIdSchema,
  stageId: StageIdSchema,
  personaId: PersonaIdSchema.optional(),
  sessionId: SessionIdSchema.optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.unknown()),
});

// =============================================================================
// CRIPTOGRAFIA
// =============================================================================

export const EncryptedDataSchema = z.object({
  ciphertext: z.string(),
  iv: z.string(),
  algorithm: z.literal('AES-GCM-256'),
  keyId: z.string(),
  version: z.number().default(1),
});

export const KeyPairSchema = z.object({
  publicKey: z.string(),
  privateKeyEncrypted: EncryptedDataSchema,
  algorithm: z.literal('RSA-OAEP-256').default('RSA-OAEP-256'),
  createdAt: z.coerce.date(),
});

// =============================================================================
// PATIENT
// =============================================================================

export const PatientDemographicsSchema = z.object({
  fullName: z.string().min(3).max(200),
  cpf: z.string().regex(/^\d{11}$/).optional(),
  cns: z.string().regex(/^\d{15}$/).optional(),
  birthDate: z.coerce.date(),
  gender: z.enum(['male', 'female', 'other', 'not_informed']),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string().regex(/^\d{8}$/),
  }).optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional(),
});

export const PatientPreferencesSchema = z.object({
  language: z.string().default('pt-BR'),
  notifications: z.object({
    sms: z.boolean().default(true),
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    whatsapp: z.boolean().default(false),
  }),
  emergencyAccess: z.boolean().default(true),
  favoriteProviders: z.array(ActorIdSchema).default([]),
  dataSharing: z.object({
    researchOptIn: z.boolean().default(false),
    anonymizedDataSharing: z.boolean().default(false),
  }).default({}),
});

// =============================================================================
// ENTITY (PROFISSIONAL)
// =============================================================================

export const EntityCredentialSchema = z.object({
  type: z.enum(['crm', 'coren', 'crp', 'crf', 'cro', 'crefito', 'crn', 'cress']),
  number: z.string(),
  state: z.string().length(2),
  specialty: z.string().optional(),
  validUntil: z.coerce.date().optional(),
  verified: z.boolean().default(false),
  verifiedAt: z.coerce.date().optional(),
});

export const EntityPreferencesSchema = z.object({
  defaultStageId: StageIdSchema.optional(),
  defaultPersonaId: PersonaIdSchema.optional(),
  notifications: z.object({
    newPatient: z.boolean().default(true),
    urgentCases: z.boolean().default(true),
    scheduleChanges: z.boolean().default(true),
  }),
  uiPreferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('pt-BR'),
    density: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
  }),
});

// =============================================================================
// SERVICE (UNIDADE)
// =============================================================================

export const ServiceLocationSchema = z.object({
  address: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string().length(2),
    zipCode: z.string().regex(/^\d{8}$/),
  }),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  timezone: z.string().default('America/Sao_Paulo'),
});

export const ServiceConfigSchema = z.object({
  name: z.string().min(3).max(200),
  serviceType: ServiceTypeSchema,
  cnes: z.string().regex(/^\d{7}$/).optional(),
  location: ServiceLocationSchema,
  operatingHours: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    openTime: z.string().regex(/^\d{2}:\d{2}$/),
    closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  })).optional(),
  capacity: z.object({
    maxConcurrentPatients: z.number().default(50),
    maxDailyConsultations: z.number().optional(),
  }).optional(),
  enabledStages: z.array(StageIdSchema).default([]),
  consentPolicies: z.array(z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    requiredForAccess: z.boolean(),
  })).default([]),
});

// =============================================================================
// LLM E AGENTS
// =============================================================================

export const GuardrailConfigSchema = z.object({
  id: z.string(),
  type: GuardrailTypeSchema,
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()),
});

export const AgentConfigSchema = z.object({
  model: LLMModelSchema,
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(100).max(128000).optional(),
  systemPrompt: z.string().min(10),
  tools: z.array(ToolIdSchema),
  guardrails: z.array(GuardrailConfigSchema),
  context: z.record(z.unknown()).optional(),
  thinkingEnabled: z.boolean().default(false),
  streamingEnabled: z.boolean().default(true),
});

export const TriggerSchema = z.object({
  type: TriggerTypeSchema,
  event: z.string().optional(),
  schedule: z.string().optional(), // Cron expression
  condition: z.string().optional(),
  priority: z.number().min(0).max(100).default(50),
});

// =============================================================================
// EVENTOS
// =============================================================================

export const EventContextSchema = z.object({
  patientActorId: ActorIdSchema.optional(),
  entityActorId: ActorIdSchema.optional(),
  serviceActorId: ActorIdSchema.optional(),
  accessGrant: AccessGrantSchema.optional(),
  previousEvents: z.array(z.string()),
  metadata: z.record(z.unknown()),
});

export const StageEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  timestamp: z.coerce.date(),
  stageId: StageIdSchema,
  actorId: ActorIdSchema,
  sessionId: SessionIdSchema,
  payload: z.record(z.unknown()),
  context: EventContextSchema,
});

// =============================================================================
// AUTOMACAO
// =============================================================================

export const AutomationRuleSchema = z.object({
  id: z.string(),
  action: z.string(),
  level: AutomationLevelSchema,
  conditions: z.array(z.string()).optional(),
  notifyActors: z.array(ActorIdSchema).optional(),
  timeout: z.number().optional(),
});

// =============================================================================
// SCRIPTS
// =============================================================================

export const ScriptActionSchema = z.object({
  type: z.enum(['generate', 'save_to', 'notify', 'queue', 'request', 'validate', 'emit', 'custom']),
  target: z.string().optional(),
  params: z.record(z.unknown()).optional(),
  timeout: z.number().optional(),
  retries: z.number().default(0),
});

export const ScriptConditionSchema = z.object({
  if: z.string(),
  then: z.array(ScriptActionSchema),
  else: z.array(ScriptActionSchema).optional(),
});

export const ScriptStepSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  trigger: z.string(),
  activate: PersonaIdSchema.optional(),
  actions: z.array(ScriptActionSchema),
  conditions: z.array(ScriptConditionSchema).optional(),
  onError: z.enum(['continue', 'stop', 'retry']).default('stop'),
  maxRetries: z.number().default(3),
});

export const ScriptManifestSchema = z.object({
  id: ScriptIdSchema,
  name: z.string(),
  description: z.string(),
  version: z.string().default('1.0.0'),
  steps: z.array(ScriptStepSchema),
  enabled: z.boolean().default(true),
});

// =============================================================================
// TOOLS (MCPs)
// =============================================================================

export const JsonSchemaSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.string(),
    properties: z.record(JsonSchemaSchema).optional(),
    required: z.array(z.string()).optional(),
    items: JsonSchemaSchema.optional(),
    enum: z.array(z.string()).optional(),
    description: z.string().optional(),
    default: z.unknown().optional(),
  })
);

export const McpToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: JsonSchemaSchema,
  outputSchema: JsonSchemaSchema.optional(),
});

export const McpResourceDefinitionSchema = z.object({
  uri: z.string().url(),
  name: z.string(),
  description: z.string(),
  mimeType: z.string(),
});

export const ToolManifestSchema = z.object({
  id: ToolIdSchema,
  name: z.string(),
  description: z.string(),
  category: PropCategorySchema,
  version: z.string().default('1.0.0'),
  mcpTools: z.array(McpToolDefinitionSchema),
  mcpResources: z.array(McpResourceDefinitionSchema).optional(),
  config: z.record(z.unknown()).optional(),
  rateLimit: z.object({
    requestsPerMinute: z.number(),
    tokensPerMinute: z.number().optional(),
  }).optional(),
});

// =============================================================================
// PERSONAS
// =============================================================================

export const PersonaManifestSchema = z.object({
  id: PersonaIdSchema,
  name: z.string(),
  description: z.string(),
  trigger: TriggerSchema,
  agent: AgentConfigSchema,
  tools: z.array(ToolIdSchema),
  guardrails: z.array(GuardrailConfigSchema),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// =============================================================================
// STAGE MANIFEST
// =============================================================================

export const StageManifestSchema = z.object({
  id: StageIdSchema,
  name: z.string(),
  description: z.string(),
  vendor: z.string(),
  version: z.string(),
  actors: z.array(ActorTypeSchema),
  tools: z.array(ToolManifestSchema),
  personas: z.array(PersonaManifestSchema),
  scripts: z.array(ScriptManifestSchema),
  automation: z.array(AutomationRuleSchema),
  ui: z.object({
    entrypoint: z.string(),
    assets: z.string(),
    theme: z.record(z.unknown()).optional(),
  }),
  requiredScopes: z.array(AccessScopeSchema),
  dependencies: z.array(z.object({
    stageId: StageIdSchema,
    version: z.string(),
    optional: z.boolean().default(false),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// =============================================================================
// API REQUEST/RESPONSE SCHEMAS
// =============================================================================

export const CastRequestSchema = z.object({
  input: z.string().min(1),
  entityActorId: ActorIdSchema,
  serviceActorId: ActorIdSchema,
  patientActorId: ActorIdSchema.optional(),
  scope: AccessScopeSchema.optional(),
  currentStageId: StageIdSchema.optional(),
  currentSessionId: SessionIdSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CastResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  stageId: StageIdSchema.optional(),
  sessionId: SessionIdSchema.optional(),
  personaId: PersonaIdSchema.optional(),
  output: z.unknown().optional(),
  actions: z.array(z.object({
    success: z.boolean(),
    action: z.string(),
    output: z.unknown().optional(),
    error: z.string().optional(),
    requiresValidation: z.boolean(),
    validatedBy: ActorIdSchema.optional(),
    validatedAt: z.coerce.date().optional(),
  })).optional(),
  durationMs: z.number(),
  tokensUsed: z.number().optional(),
});

// =============================================================================
// ONBOARDING SCHEMAS
// =============================================================================

export const PatientOnboardingSchema = z.object({
  step: z.enum(['identity', 'demographics', 'consent', 'security', 'complete']),
  demographics: PatientDemographicsSchema.optional(),
  consentAccepted: z.array(z.string()).optional(),
  securitySetup: z.object({
    passwordSet: z.boolean(),
    mfaEnabled: z.boolean(),
    recoverySetup: z.boolean(),
  }).optional(),
});

export const EntityOnboardingSchema = z.object({
  step: z.enum(['identity', 'credentials', 'service_link', 'preferences', 'complete']),
  credentials: z.array(EntityCredentialSchema).optional(),
  linkedServices: z.array(ActorIdSchema).optional(),
  preferences: EntityPreferencesSchema.optional(),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
});

export const ServiceOnboardingSchema = z.object({
  step: z.enum(['identity', 'config', 'stages', 'entities', 'complete']),
  config: ServiceConfigSchema.optional(),
  enabledStages: z.array(StageIdSchema).optional(),
  adminEntities: z.array(ActorIdSchema).optional(),
});

// =============================================================================
// EXPORTS
// =============================================================================

// Type inference helpers
export type ActorId = z.infer<typeof ActorIdSchema>;
export type StageId = z.infer<typeof StageIdSchema>;
export type PersonaId = z.infer<typeof PersonaIdSchema>;
export type ToolId = z.infer<typeof ToolIdSchema>;
export type ScriptId = z.infer<typeof ScriptIdSchema>;
export type SessionId = z.infer<typeof SessionIdSchema>;

export type AccessScope = z.infer<typeof AccessScopeSchema>;
export type AccessGrant = z.infer<typeof AccessGrantSchema>;
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
export type EncryptedData = z.infer<typeof EncryptedDataSchema>;
export type KeyPair = z.infer<typeof KeyPairSchema>;

export type PatientDemographics = z.infer<typeof PatientDemographicsSchema>;
export type PatientPreferences = z.infer<typeof PatientPreferencesSchema>;
export type EntityCredential = z.infer<typeof EntityCredentialSchema>;
export type EntityPreferences = z.infer<typeof EntityPreferencesSchema>;
export type ServiceLocation = z.infer<typeof ServiceLocationSchema>;
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type GuardrailConfig = z.infer<typeof GuardrailConfigSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type StageEvent = z.infer<typeof StageEventSchema>;
export type AutomationRule = z.infer<typeof AutomationRuleSchema>;

export type ScriptAction = z.infer<typeof ScriptActionSchema>;
export type ScriptCondition = z.infer<typeof ScriptConditionSchema>;
export type ScriptStep = z.infer<typeof ScriptStepSchema>;
export type ScriptManifest = z.infer<typeof ScriptManifestSchema>;

export type ToolManifest = z.infer<typeof ToolManifestSchema>;
export type PersonaManifest = z.infer<typeof PersonaManifestSchema>;
export type StageManifest = z.infer<typeof StageManifestSchema>;

export type CastRequest = z.infer<typeof CastRequestSchema>;
export type CastResponse = z.infer<typeof CastResponseSchema>;

export type PatientOnboarding = z.infer<typeof PatientOnboardingSchema>;
export type EntityOnboarding = z.infer<typeof EntityOnboardingSchema>;
export type ServiceOnboarding = z.infer<typeof ServiceOnboardingSchema>;
