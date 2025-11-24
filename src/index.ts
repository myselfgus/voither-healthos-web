/**
 * HealthOS Core - Exports
 *
 * Este e o ponto de entrada principal do HealthOS.
 * Re-exporta todos os modulos de packages/.
 */

// =============================================================================
// CAST (Sistema Operacional)
// =============================================================================

export {
  Cast,
  PatientActor,
  BaseActor,
  EntityActor,
  ServiceActor,
  BasePropActor,
  PropActors,
  OnboardingManager,
} from '@healthos/cast';

export type {
  CastRequest,
  CastResponse,
  OrchestratorDecision,
  CastState,
  CastMetrics,
  OrchestratorConfig,
  StageFactory as CastStageFactory,
  IStage,
  Env,
  ActorState,
  PropConfig,
  OnboardingType,
  OnboardingStatus,
  OnboardingStep,
  OnboardingSession,
  PatientOnboardingData,
  EntityOnboardingData,
  ServiceOnboardingData,
} from '@healthos/cast';

// =============================================================================
// STAGE (Ambiente/App)
// =============================================================================

export {
  Stage,
  StageFactory,
  DefaultTool,
  Act,
  ScriptBuilder,
  StepBuilder,
  Persona,
} from '@healthos/stage';

export type {
  StageState,
  StageSession,
  StageMetrics,
  ITool,
  ToolDefinition,
  ToolFactory,
  ScriptResult,
  ScriptContext,
  StepResult,
  AgentContext,
} from '@healthos/stage';

// =============================================================================
// SHARED (Tipos e Schemas)
// =============================================================================

export * from '@healthos/shared';

// =============================================================================
// VERSION
// =============================================================================

export const VERSION = '1.0.0';
export const NAME = 'HealthOS';
