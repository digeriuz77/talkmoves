/**
 * Core 6 Strategy Matrix (S1–S6): the cumulative spotlight reaches every coaching endpoint.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupServer,
  postJson,
  startMockLlm,
  startTestServer,
  systemPromptOf,
  userTextOf,
  type MockLlm,
  type RecordedRequest,
  type TestServer,
} from './helpers';
import { standardResponder } from './fixtures';
import gold from '../../core6_strategies.json';

type StrategyRow = {
  id: string;
  name: string;
  shortName: string;
  window: string;
  teacherMove: string;
  pupilTarget: string;
};

const STRATEGIES = gold.strategies as StrategyRow[];
const EXPECTED_LOCKED_NAMES: Record<string, string> = {
  S1: 'Open Question + Wait Time (5–7s)',
  S2: 'Safe Rehearsal (Think-Pair-Share + L1 Bridge)',
  S3: 'Deliberate Vocabulary & EAL Sentence Ladder',
  S4: 'Uptake Moves (Revoice, Probe & Evidence)',
  S5: 'Whole-Class Check & Adapt (AfL)',
  S6: 'Competing Claims & What-If Transfer (Concept Cartoons)',
};

const ENDPOINTS: Array<[route: string, body: Record<string, unknown>]> = [
  ['/api/talk-move-plan', { question: 'Why is the river muddy after rain?' }],
  ['/api/lesson-coach', { lessonPlanText: 'Step 1: Teacher explains evaporation for ten minutes.' }],
  ['/api/live-coach', { observation: 'My Year 4s are silent.' }],
  ['/api/primer', { words: ['evaporation', 'vapour'] }],
  ['/api/concept-cartoon', { topic: 'Evaporation — drying clothes in the sun' }],
];

describe('Core 6 Strategy Matrix', () => {
  let mock: MockLlm;
  let server: TestServer;

  beforeAll(async () => {
    mock = await startMockLlm(standardResponder());
    server = await startTestServer({
      LLM_PROVIDER: 'openai-compatible',
      LLM_BASE_URL: `${mock.url}/v1/chat/completions`,
      LLM_API_KEY: 'test-key',
    });
  });

  afterAll(async () => {
    await cleanupServer(server);
    await mock.close();
  });

  async function call(route: string, body: Record<string, unknown>, activeStrategy?: unknown) {
    mock.requests.length = 0;
    const response = await postJson(server.baseUrl, route, { ...body, activeStrategy });
    expect(response.status, `${route} with ${String(activeStrategy)}`).toBe(200);
    return { request: mock.requests[0] as RecordedRequest, payload: await response.json() };
  }

  it('locks the six strategy names to the programme spine', () => {
    expect(STRATEGIES.map((strategy) => strategy.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
    for (const strategy of STRATEGIES) {
      expect(strategy.name, strategy.id).toBe(EXPECTED_LOCKED_NAMES[strategy.id]);
      expect(strategy.window, strategy.id).not.toBe('');
      expect(strategy.teacherMove, strategy.id).not.toBe('');
    }
  });

  for (const [route, body] of ENDPOINTS) {
    it(`${route}: makes the active strategy the primary spotlight, earlier habits still allowed`, async () => {
      const { request, payload } = await call(route, body, 'S3');
      const system = systemPromptOf(request);

      expect(system).toContain('ACTIVE STRATEGY SPOTLIGHT: S3');
      expect(system).toContain('"Deliberate Vocabulary & EAL Sentence Ladder"');
      expect(system).toContain('(Week 3 (embed W4))');
      expect(system).toContain('Make S3 the PRIMARY SPOTLIGHT of the generated teacher script, board frames, and follow-up moves');
      // Cumulative spotlight: S1 and S2 are named as supporting habits and never banned.
      expect(system).toContain('CUMULATIVE SPOTLIGHT RULE');
      expect(system).toContain('must never be banned, removed, or avoided: S1 Open Question + Wait Time; S2 Safe Rehearsal');
      expect(system).toContain('Later strategies (S4, S5, S6) are NOT the spotlight here');
      expect(system).toContain("In Science, say it with me: [term]. Point and say...");
      // The teacher also sees the spotlight on the user turn.
      expect(userTextOf(request)).toContain('Core 6 Strategy spotlight: S3');
      // And the validated strategy is echoed back for the UI badge.
      expect(payload.meta.strategy).toMatchObject({
        id: 'S3',
        name: 'Deliberate Vocabulary & EAL Sentence Ladder',
        window: 'Week 3 (embed W4)',
      });
    });

    it(`${route}: works unchanged when no strategy is active`, async () => {
      const { request, payload } = await call(route, body, undefined);
      expect(systemPromptOf(request)).not.toContain('ACTIVE STRATEGY SPOTLIGHT');
      expect(userTextOf(request)).not.toContain('Core 6 Strategy spotlight');
      expect(payload.meta.strategy).toBeNull();
    });
  }

  it('accepts lowercase ids and ignores ids outside S1–S6', async () => {
    // Stateless endpoint, so every call reaches the model (the primer cache would short-circuit).
    const body = { topic: 'Evaporation — drying clothes in the sun' };
    const lower = await call('/api/concept-cartoon', body, ' s6 ');
    expect(systemPromptOf(lower.request)).toContain('ACTIVE STRATEGY SPOTLIGHT: S6');
    expect(lower.payload.meta.strategy).toMatchObject({ id: 'S6' });

    for (const invalid of ['S7', 'S0', 'T1', 'strategy-3', '<script>', 3, null]) {
      const { request, payload } = await call('/api/concept-cartoon', body, invalid);
      expect(systemPromptOf(request), String(invalid)).not.toContain('ACTIVE STRATEGY SPOTLIGHT');
      expect(payload.meta.strategy, String(invalid)).toBeNull();
    }
  });

  it('S1 opens the spine (no earlier habits) and S6 has every earlier habit supporting it', async () => {
    const s1 = await call('/api/talk-move-plan', { question: 'Why is the river muddy after rain?' }, 'S1');
    expect(systemPromptOf(s1.request)).toContain('CUMULATIVE SPOTLIGHT RULE: S1 opens the spine');
    expect(systemPromptOf(s1.request)).not.toContain('must never be banned');
    expect(systemPromptOf(s1.request)).toContain('Later strategies (S2, S3, S4, S5, S6) are NOT the spotlight here');

    const s6 = await call('/api/talk-move-plan', { question: 'Why is the river muddy after rain?' }, 'S6');
    const system = systemPromptOf(s6.request);
    expect(system).toContain(
      'must never be banned, removed, or avoided: S1 Open Question + Wait Time; S2 Safe Rehearsal; S3 Vocabulary & Sentence Ladder; S4 Uptake Moves; S5 Whole-Class Check & Adapt',
    );
    expect(system).toContain('S6 closes the Sprint 1 spine');
    expect(system).not.toContain('are NOT the spotlight here');
  });

  it('carries each strategy’s locked teacher move and target pupil discourse into the prompt', async () => {
    for (const strategy of STRATEGIES) {
      const { request } = await call('/api/concept-cartoon', { topic: 'Evaporation — drying clothes' }, strategy.id);
      const system = systemPromptOf(request);
      expect(system, strategy.id).toContain(`Primary teacher move: ${strategy.teacherMove}`);
      expect(system, strategy.id).toContain(`- Target pupil discourse / action: ${strategy.pupilTarget}`);
    }
  });

  it('keeps the spotlight on later turns of a Live Coach thread', async () => {
    const thread = [
      { role: 'teacher', text: 'Pupils are silent.' },
      { role: 'coach', text: 'Try a pair rehearsal first.' },
      { role: 'teacher', text: 'They talked in Iban but not English.' },
    ];
    const { request, payload } = await call('/api/live-coach', { thread }, 'S4');
    const messages = request.body.messages as Array<{ role: string; content: string }>;
    expect(systemPromptOf(request)).toContain('ACTIVE STRATEGY SPOTLIGHT: S4');
    const contextTurn = messages.find((message) => message.role === 'user' && message.content.includes('Class context'));
    expect(contextTurn?.content).toContain('Core 6 Strategy spotlight: S4');
    expect(payload.meta.strategy).toMatchObject({ id: 'S4' });
  });
});
