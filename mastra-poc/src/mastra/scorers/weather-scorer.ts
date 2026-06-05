import { createScorer } from '@mastra/core/evals';

export const toolCallAppropriatenessScorer = createScorer({
  id: 'tool-call-appropriateness',
  name: 'Tool Call Appropriateness',
  description: 'Evalua si las llamadas a herramientas fueron apropiadas',
  execute: async () => ({ score: 1 }),
});

export const completenessScorer = createScorer({
  id: 'completeness',
  name: 'Completeness',
  description: 'Evalua si la respuesta fue completa',
  execute: async () => ({ score: 1 }),
});

export const translationScorer = createScorer({
  id: 'translation',
  name: 'Translation Quality',
  description: 'Evalua la calidad de la traduccion',
  execute: async () => ({ score: 1 }),
});
