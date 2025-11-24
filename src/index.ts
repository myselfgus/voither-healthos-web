/**
 * HealthOS Core - Exports
 * 
 * Este é o ponto de entrada principal do HealthOS Core.
 * Exporta todas as classes, tipos e utilitários.
 */

// =============================================================================
// TYPES
// =============================================================================

export * from './types';

// =============================================================================
// ACTORS
// =============================================================================

export { 
  PatientActor,
  type PatientState,
  type PatientPreferences,
} from './actors/patient-actor';

export {
  EntityActor,
  ServiceActor,
  type EntityState,
  type EntityCredential,
  type EntitySession,
  type EntityPreferences,
  type ServiceState,
  type ServiceLocation,
  type ServiceSession,
  type ServiceConfig,
} from './actors/entity-service-actors';

export {
  BasePropActor,
  ASLTool,
  SISREGTool,
  DocumentGeneratorTool,
  PropActors,
  type ToolConfig,
  type ASLAnalysisResult,
  type LinguisticPattern,
  type SentimentAnalysis,
  type ClinicalMarker,
} from './actors/tool-actor';

// =============================================================================
// PERSONA
// =============================================================================

export {
  Persona,
  Agent,
  NeverPrescribeGuardrail,
  RequireValidationGuardrail,
  TimeoutGuardrail,
  type AgentContext,
  type AgentMessage,
  type Guardrail,
  type GuardrailResult,
} from './persona/persona';

// =============================================================================
// SCRIPT
// =============================================================================

export {
  Script,
  ScriptBuilder,
  StepBuilder,
  ConsultationScript,
  type ScriptContext,
  type StepResult,
  type ScriptResult,
} from './script/script';

// =============================================================================
// STAGE
// =============================================================================

export {
  Stage,
  StageFactory,
  type StageState,
  type StageSession,
} from './stage/stage';

// =============================================================================
// CAST
// =============================================================================

export {
  Cast,
  ORCHESTRATOR_SYSTEM_PROMPT,
  type CastState,
  type OrchestratorConfig,
  type OrchestratorDecision,
  type CastRequest,
  type CastResponse,
  type Env,
} from './cast/cast';

// =============================================================================
// VERSION
// =============================================================================

export const VERSION = '1.0.0';
export const NAME = 'HealthOS Core';
