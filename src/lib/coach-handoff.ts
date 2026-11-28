/**
 * Hand-off from one coaching tool into the Live Coach (e.g. a Concept Cartoon follow-up chip).
 * Carried in React state only — never persisted — so no classroom text is stored.
 */
export type LiveCoachHandoff = {
  source: 'concept-cartoon';
  /** Classroom context that pre-fills the teacher's draft (AI-generated, generic). */
  promptContext: string;
  /** Live Coach action trigger: 'reset' | 'firm_up' | 'diagnose'. */
  actionTrigger: string;
  /** Core 6 strategy ('S1'–'S6') the next move should spotlight, or '' for none. */
  targetStrategy: string;
};
