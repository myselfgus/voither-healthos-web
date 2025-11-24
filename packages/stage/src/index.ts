/**
 * @healthos/stage
 *
 * HealthOS Stage - Ambiente/App Runtime
 *
 * O Stage é um ambiente/aplicação que roda no Cast, contendo:
 * - Act: Workflow declarativo + runtime de orquestração
 * - Personas: Agentes inteligentes (Claude Agent SDK)
 * - Tools: MCPs específicos do Stage
 */

// Stage base
export { Stage, StageFactory } from './stage';

// Act (Workflow + Orquestração)
// Script é exportado como Act para alinhar com a nomenclatura da arquitetura
export { Script as Act, ScriptBuilder, StepBuilder } from './act/script';
export type { ScriptResult, ScriptContext, StepResult } from './act/script';

// Persona
export { Persona } from './persona/persona';

// Re-export types
export * from '@healthos/shared';
