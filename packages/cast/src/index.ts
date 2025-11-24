/**
 * @healthos/cast
 *
 * HealthOS Cast - Sistema Operacional
 *
 * O Cast é o "sistema operacional" do HealthOS, responsável por:
 * - Gerenciar Actors universais (Patient, Entity, Service, Tool)
 * - Coordenar acesso e permissões
 * - Prover Tool Actors compartilhados entre Stages
 */

// Cast Manager
export { Cast } from './cast';
export type {
  CastRequest,
  CastResponse,
  OrchestratorDecision,
  CastState,
  CastMetrics,
  OrchestratorConfig,
  StageSession,
  StageFactory,
  IStage,
  Env,
} from './cast';

// Actors Universais
export { PatientActor, BaseActor } from './actors/patient';
export type { ActorState } from './actors/patient';
export { EntityActor, ServiceActor } from './actors/entity-service';
export { BasePropActor, PropActors } from './actors/prop';
export type { PropConfig } from './actors/prop';

// Onboarding
export { OnboardingManager } from './onboarding';
export type {
  OnboardingType,
  OnboardingStatus,
  OnboardingStep,
  OnboardingSession,
  PatientOnboardingData,
  EntityOnboardingData,
  ServiceOnboardingData,
} from './onboarding';

// Re-export types
export * from '@healthos/shared';
