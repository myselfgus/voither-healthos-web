/**
 * HealthOS Core Types
 * 
 * Este arquivo define os tipos fundamentais da arquitetura HealthOS.
 * A hierarquia é:
 * 
 * CAST (HealthOS) - O sistema operacional / Cast Manager
 *   └── ACTORS - Entidades universais compartilhadas
 *       ├── PatientActor - Soberano dos seus dados
 *       ├── EntityActor - Profissionais e admins
 *       ├── ServiceActor - Unidades de saúde
 *       └── PropActor - Capacidades (MCPs)
 *   └── STAGES - Ambientes/Apps específicos
 *       ├── Tools - MCPs específicos do Stage
 *       ├── Personas - Agent + Tools + Guardrails + Context
 *       └── Scripts - Fluxos declarativos
 */

// =============================================================================
// IDENTIFICADORES
// =============================================================================

export type ActorId = string & { readonly __brand: 'ActorId' };
export type StageId = string & { readonly __brand: 'StageId' };
export type PersonaId = string & { readonly __brand: 'PersonaId' };
export type ToolId = string & { readonly __brand: 'ToolId' };
export type ScriptId = string & { readonly __brand: 'ScriptId' };
export type SessionId = string & { readonly __brand: 'SessionId' };

// Helpers para criar IDs tipados
export const createActorId = (id: string): ActorId => id as ActorId;
export const createStageId = (id: string): StageId => id as StageId;
export const createPersonaId = (id: string): PersonaId => id as PersonaId;
export const createToolId = (id: string): ToolId => id as ToolId;
export const createScriptId = (id: string): ScriptId => id as ScriptId;
export const createSessionId = (id: string): SessionId => id as SessionId;

// =============================================================================
// TIPOS DE ACTORS
// =============================================================================

export type ActorType = 'patient' | 'entity' | 'service' | 'tool';

export type EntityRole = 
  | 'physician'
  | 'nurse'
  | 'psychologist'
  | 'admin'
  | 'regulator'
  | 'pharmacist'
  | 'lab_technician';

export type ServiceType = 
  | 'clinic'
  | 'hospital'
  | 'ubs'
  | 'upa'
  | 'laboratory'
  | 'pharmacy'
  | 'regulation_center';

export type ToolCategory = 
  | 'capability'      // Faz coisas específicas (ASL, GEM)
  | 'integration'     // Conecta sistemas externos (SISREG, labs)
  | 'knowledge'       // Consulta bases (CID, protocolos)
  | 'automation';     // Executa ações (docs, forms, notify)

// =============================================================================
// SEGURANÇA E ACESSO
// =============================================================================

export interface AccessScope {
  /** Tipos de dados que podem ser acessados */
  dataTypes: DataType[];
  /** Ações permitidas */
  actions: AccessAction[];
  /** Duração do acesso em segundos */
  durationSeconds: number;
  /** Motivo do acesso (auditoria) */
  reason: string;
}

export type DataType = 
  | 'demographics'
  | 'medical_history'
  | 'consultations'
  | 'prescriptions'
  | 'exams'
  | 'mental_health'
  | 'all';

export type AccessAction = 
  | 'read'
  | 'write'
  | 'append'
  | 'share';

export interface AccessGrant {
  id: string;
  patientActorId: ActorId;
  entityActorId: ActorId;
  serviceActorId: ActorId;
  scope: AccessScope;
  grantedAt: Date;
  expiresAt: Date;
  sessionKey: string; // Chave de sessão derivada
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  actorId: ActorId;
  targetActorId: ActorId;
  action: string;
  scope: AccessScope;
  serviceActorId: ActorId;
  stageId: StageId;
  personaId?: PersonaId;
  metadata: Record<string, unknown>;
}

// =============================================================================
// CRIPTOGRAFIA
// =============================================================================

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  algorithm: 'AES-GCM-256';
  keyId: string;
}

export interface KeyPair {
  publicKey: string;
  privateKeyEncrypted: EncryptedData; // Criptografada com senha do paciente
}

export interface SessionKey {
  key: string;
  expiresAt: Date;
  scope: AccessScope;
}

// =============================================================================
// LLM E AGENTS
// =============================================================================

export type LLMModel = 
  | 'claude-sonnet-4-20250514'
  | 'claude-haiku'
  | 'gpt-4o'
  | 'gemini-pro';

export interface LLMConfig {
  model: LLMModel;
  temperature: number;
  maxTokens?: number;
  systemPrompt: string;
}

export interface AgentConfig extends LLMConfig {
  /** Tools (MCPs) que o agent pode usar */
  tools: ToolId[];
  /** Guardrails que limitam o agent */
  guardrails: GuardrailConfig[];
  /** Contexto adicional */
  context?: Record<string, unknown>;
}

export interface GuardrailConfig {
  id: string;
  type: GuardrailType;
  config: Record<string, unknown>;
}

export type GuardrailType = 
  | 'never_prescribe'
  | 'require_validation'
  | 'no_pii_in_logs'
  | 'max_retries'
  | 'timeout'
  | 'scope_limit'
  | 'custom';

// =============================================================================
// EVENTOS E TRIGGERS
// =============================================================================

export type TriggerType = 
  | 'manual'           // Ativação manual pelo usuário
  | 'auto'             // Ativação automática quando Stage inicia
  | 'event'            // Ativação por evento específico
  | 'schedule'         // Ativação agendada
  | 'condition';       // Ativação quando condição é satisfeita

export interface Trigger {
  type: TriggerType;
  event?: string;      // Nome do evento (se type === 'event')
  schedule?: string;   // Cron expression (se type === 'schedule')
  condition?: string;  // Expressão condicional (se type === 'condition')
}

export interface StageEvent {
  id: string;
  type: string;
  timestamp: Date;
  stageId: StageId;
  actorId: ActorId;
  sessionId: SessionId;
  payload: Record<string, unknown>;
  context: EventContext;
}

export interface EventContext {
  patientActorId?: ActorId;
  entityActorId?: ActorId;
  serviceActorId?: ActorId;
  accessGrant?: AccessGrant;
  previousEvents: string[];
  metadata: Record<string, unknown>;
}

// =============================================================================
// AUTOMAÇÃO
// =============================================================================

export type AutomationLevel = 
  | 'auto_execute'           // Sempre automático, sem validação
  | 'auto_with_notification' // Automático, mas notifica
  | 'require_validation'     // Requer validação explícita
  | 'require_signature';     // Requer assinatura digital

export interface AutomationRule {
  action: string;
  level: AutomationLevel;
  conditions?: string[];
}

// =============================================================================
// RESULTADOS E RESPOSTAS
// =============================================================================

export interface ActionResult {
  success: boolean;
  action: string;
  output?: unknown;
  error?: string;
  requiresValidation: boolean;
  validatedBy?: ActorId;
  validatedAt?: Date;
}

export interface PersonaResponse {
  personaId: PersonaId;
  sessionId: SessionId;
  timestamp: Date;
  thinking: string;
  actions: ActionResult[];
  output: unknown;
  tokensUsed: number;
  durationMs: number;
}

// =============================================================================
// CONFIGURAÇÕES DECLARATIVAS
// =============================================================================

export interface StageManifest {
  id: StageId;
  name: string;
  description: string;
  vendor: string;
  version: string;
  
  /** Tipos de Actors que este Stage utiliza */
  actors: ActorType[];
  
  /** Tools específicos deste Stage */
  tools: ToolManifest[];
  
  /** Personas disponíveis */
  personas: PersonaManifest[];
  
  /** Scripts (fluxos) */
  scripts: ScriptManifest[];
  
  /** Regras de automação */
  automation: AutomationRule[];
  
  /** UI assets */
  ui: {
    entrypoint: string;
    assets: string;
  };
  
  /** Permissões necessárias */
  requiredScopes: AccessScope[];
}

export interface ToolManifest {
  id: ToolId;
  name: string;
  description: string;
  category: ToolCategory;
  
  /** Schema MCP */
  mcpTools: McpToolDefinition[];
  mcpResources?: McpResourceDefinition[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: string[];
  description?: string;
}

export interface PersonaManifest {
  id: PersonaId;
  name: string;
  description: string;
  
  /** Quando a persona é ativada */
  trigger: Trigger;
  
  /** Configuração do Agent */
  agent: AgentConfig;
  
  /** Tools que esta persona pode usar */
  tools: ToolId[];
  
  /** Guardrails específicos */
  guardrails: GuardrailConfig[];
}

export interface ScriptManifest {
  id: ScriptId;
  name: string;
  description: string;
  
  /** Passos do script */
  steps: ScriptStep[];
}

export interface ScriptStep {
  id: string;
  trigger: string;
  activate?: PersonaId;
  actions: ScriptAction[];
  conditions?: ScriptCondition[];
}

export interface ScriptAction {
  type: 'generate' | 'save_to' | 'notify' | 'queue' | 'request' | 'validate' | 'custom';
  target?: string;
  params?: Record<string, unknown>;
}

export interface ScriptCondition {
  if: string;
  then: ScriptAction[];
  else?: ScriptAction[];
}
