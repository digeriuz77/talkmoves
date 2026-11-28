/**
 * POST /api/concept-cartoon — Concept Cartoon Studio guardrails, enforced on the real server.
 * Every test boots its own server against a local mock LLM endpoint.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  CACHE_FILE,
  cleanupServer,
  chatCompletion,
  fileExists,
  llmError,
  postJson,
  startMockLlm,
  startTestServer,
  systemPromptOf,
  type MockLlm,
  type RecordedRequest,
  type TestServer,
} from './helpers';
import { GOLD_CARTOON_TOPIC, goldCartoonModelOutput, standardResponder } from './fixtures';

const CAST = ['Ali', 'Bisi', 'Cempaka'];
const TOPIC = { topic: GOLD_CARTOON_TOPIC };
const LIMIT_WARNING = 'bubble is 24 words (the Year 4 limit is 18)';

type ClaimType = 'sound' | 'misconception' | 'language_trap';
type Claim = {
  id: string;
  character: string;
  type: string;
  english: string;
  bridge: { iban: string; sarawakMalay: string; ibanNeedsTeacherCheck: boolean };
  teacherNote: string;
};
type Cartoon = {
  topic: string;
  activeStrategy: string;
  privacyNotice: string;
  aiNotice: string;
  claims: Claim[];
  sentenceStems: string[];
  whatIfQuestion: { english: string; bridge: string };
  followUpChips: Array<{
    id: string;
    label: string;
    targetStrategy: string;
    nextActionMode: string;
    promptContext: string;
  }>;
  warnings: string[];
};

/** A valid model-shaped cartoon with per-claim overrides. */
function modelCartoon(overrides: Partial<Record<ClaimType, Record<string, unknown>>> = {}) {
  const output = goldCartoonModelOutput();
  return {
    ...output,
    claims: output.claims.map((claim) => ({
      ...claim,
      ...(overrides[claim.type as ClaimType] || {}),
    })),
  };
}

describe('POST /api/concept-cartoon', () => {
  let mock: MockLlm | null = null;
  let server: TestServer | null = null;

  async function boot(responder = standardResponder()) {
    await teardown();
    mock = await startMockLlm(responder);
    server = await startTestServer({
      LLM_PROVIDER: 'openai-compatible',
      LLM_BASE_URL: `${mock.url}/v1/chat/completions`,
      LLM_API_KEY: 'test-key',
    });
  }

  async function teardown() {
    await cleanupServer(server);
    server = null;
    if (mock) {
      await mock.close();
      mock = null;
    }
  }

  afterEach(teardown);

  async function generate(body: Record<string, unknown> = TOPIC) {
    if (!server || !mock) throw new Error('boot() first');
    const requestsBefore = mock.requests.length;
    const response = await postJson(server.baseUrl, '/api/concept-cartoon', body);
    const payload = await response.json();
    return {
      status: response.status,
      payload,
      cartoon: payload.plan as Cartoon,
      meta: payload.meta,
      request: mock.requests[requestsBefore] as RecordedRequest | undefined,
      modelCalls: mock.requests.length - requestsBefore,
    };
  }

  describe('with the gold-standard model output', () => {
    it('returns the full envelope with the fixed cast and one claim per type', async () => {
      await boot();
      const { status, cartoon } = await generate();
      expect(status).toBe(200);
      expect(cartoon.topic).toBe(GOLD_CARTOON_TOPIC);
      expect(cartoon.activeStrategy).toBe('');
      expect(cartoon.privacyNotice).toBe('Keep inputs generic — do not enter pupil or school names.');
      expect(cartoon.aiNotice).toBe('AI-Generated — Verify scientific accuracy and Iban phrasing before class use.');
      expect(cartoon.warnings).toEqual([]);

      expect(cartoon.claims).toHaveLength(3);
      expect(cartoon.claims.map((claim) => claim.character).sort()).toEqual([...CAST].sort());
      expect(cartoon.claims.map((claim) => claim.type).sort()).toEqual(['language_trap', 'misconception', 'sound']);
      expect(cartoon.claims.map((claim) => claim.id)).toEqual(['claim_1', 'claim_2', 'claim_3']);

      const sound = cartoon.claims.find((claim) => claim.type === 'sound');
      expect(sound?.english).toBe('Heat from the sun turns liquid water into invisible gas that moves into the air.');
      expect(sound?.bridge).toEqual({
        iban: 'Panas matahari ngubah ai nyadi wap ti enda dipeda lalu tama ngagai angin.',
        sarawakMalay: 'Panas matahari tukar aik jadi wap yang sik nampak, lalu masuk ke udara.',
        ibanNeedsTeacherCheck: false,
      });
      expect(sound?.teacherNote).toContain('Sound reasoning');

      expect(cartoon.sentenceStems).toHaveLength(4);
      expect(cartoon.whatIfQuestion.english).toContain('What if we hang the exact same wet shirt');
      expect(cartoon.whatIfQuestion.bridge).toContain('Kati enti baju basah nya digantung');
      expect(cartoon.followUpChips.map((chip) => [chip.targetStrategy, chip.nextActionMode])).toEqual([
        ['S5', 'reset'],
        ['S3', 'firm_up'],
        ['S6', 'firm_up'],
      ]);
      expect(cartoon.followUpChips[2].promptContext).toContain('What-If transfer twist');
    });

    it('randomises which character holds each role on every generation', async () => {
      await boot();
      const roleMappings = new Set<string>();
      const displayOrders = new Set<string>();
      for (let round = 0; round < 14; round += 1) {
        const { cartoon } = await generate();
        const byType = Object.fromEntries(cartoon.claims.map((claim) => [claim.type, claim.character]));
        expect(new Set(Object.values(byType))).toEqual(new Set(CAST));
        roleMappings.add(JSON.stringify(byType));
        displayOrders.add(cartoon.claims.map((claim) => claim.type).join(','));
      }
      // 6 role mappings exist; the chance 14 draws all land on one fixed mapping is about (1/6)^13.
      expect(roleMappings.size).toBeGreaterThan(1);
      expect(displayOrders.size).toBeGreaterThan(1);
    });

    it('sends the strict guardrails and the few-shot example to the model', async () => {
      await boot();
      const { request } = await generate();
      const system = systemPromptOf(request!);
      expect(system).toContain('EXACTLY THREE CHARACTERS: Ali, Bisi, and Cempaka');
      expect(system).toContain('one of EACH type');
      expect(system).toContain('"sound" | "misconception" | "language_trap"');
      expect(system).toContain('ROLE RANDOMISATION');
      expect(system).toContain('REGISTER - CEFR A2 / Year 4 EAL (STRICT)');
      expect(system).toContain('Each "english" bubble is at most 18 words');
      expect(system).toContain('NO character name inside the bubble text');
      expect(system).toContain('IBAN SAFETY RULE: Never fabricate uncertain technical Iban');
      expect(system).toContain('"ibanNeedsTeacherCheck": true');
      expect(system).toContain('GOLD-STANDARD EXAMPLE');
      expect(system).toContain('never reuse its topic, claims, or wording');
      expect(system).toContain('Never invent or repeat real pupil, teacher, or school names');
    });
  });

  describe('guardrail enforcement on imperfect model output', () => {
    it('re-assigns the fixed cast when the model repeats or invents characters', async () => {
      await boot(
        standardResponder({
          cartoonOutput: () =>
            modelCartoon({
              sound: { character: 'Ali' },
              misconception: { character: 'Ali' },
              language_trap: { character: 'Dina' },
            }),
        }),
      );
      const { cartoon } = await generate();
      expect(cartoon.claims.map((claim) => claim.character).sort()).toEqual([...CAST].sort());
      expect(cartoon.claims.find((claim) => claim.type === 'language_trap')?.english).toContain('melting');
    });

    it('strips attribution prefixes and wrapping quotes from bubbles and bridges', async () => {
      await boot(
        standardResponder({
          cartoonOutput: () =>
            modelCartoon({
              sound: {
                english: '“Ali says: The sun heats the water and it becomes vapour.”',
                bridge: {
                  iban: 'Ali madahka: Matahari angat ai lalu nyadi wap.',
                  sarawakMalay: '"Bisi berkata: Matahari panaskan aik jadi wap."',
                  ibanNeedsTeacherCheck: false,
                },
              },
            }),
        }),
      );
      const { cartoon } = await generate();
      const sound = cartoon.claims.find((claim) => claim.type === 'sound');
      expect(sound?.english).toBe('The sun heats the water and it becomes vapour.');
      expect(sound?.bridge.iban).toBe('Matahari angat ai lalu nyadi wap.');
      expect(sound?.bridge.sarawakMalay).toBe('Matahari panaskan aik jadi wap.');
      expect(cartoon.warnings).toEqual([]);
    });

    it('flags an over-long A2 bubble as a warning instead of truncating it', async () => {
      const longBubble =
        'I think that the heat from the bright hot sun makes the water in the wet shirt change into a gas and go up.';
      await boot(standardResponder({ cartoonOutput: () => modelCartoon({ sound: { english: longBubble } }) }));
      const { status, cartoon } = await generate();
      const sound = cartoon.claims.find((claim) => claim.type === 'sound');
      expect(status).toBe(200);
      expect(sound?.english).toBe(longBubble);
      expect(cartoon.warnings).toEqual([expect.stringContaining(LIMIT_WARNING)]);
    });

    it('warns when a character name is written inside a bubble', async () => {
      await boot(
        standardResponder({
          cartoonOutput: () =>
            modelCartoon({ misconception: { english: 'I agree with Cempaka: the water just goes.' } }),
        }),
      );
      const { cartoon } = await generate();
      expect(cartoon.warnings).toEqual([expect.stringContaining('A character name is written inside')]);
    });

    it('applies the Iban safety rule', async () => {
      await boot(
        standardResponder({
          cartoonOutput: () =>
            modelCartoon({
              // The model flags it itself.
              sound: {
                bridge: { iban: 'Uji penyejatan.', sarawakMalay: 'Penyejatan.', ibanNeedsTeacherCheck: true },
              },
              // Iban bridge missing.
              misconception: { bridge: { iban: '', sarawakMalay: 'Aik ya hilang.', ibanNeedsTeacherCheck: false } },
              // English technical term left untranslated inside the Iban line.
              language_trap: {
                english: 'The shirt is evaporating downwards.',
                bridge: {
                  iban: 'Baju nya evaporating ke baruh.',
                  sarawakMalay: 'Baju ya menitis ke bawah.',
                  ibanNeedsTeacherCheck: false,
                },
              },
            }),
        }),
      );
      const { cartoon } = await generate();
      const byType = Object.fromEntries(cartoon.claims.map((claim) => [claim.type, claim]));
      expect(byType.sound.bridge.ibanNeedsTeacherCheck).toBe(true);
      expect(byType.misconception.bridge.ibanNeedsTeacherCheck).toBe(true);
      expect(byType.language_trap.bridge.ibanNeedsTeacherCheck).toBe(true);
      expect(cartoon.warnings).toEqual([expect.stringContaining('Iban bridge')]);
    });

    it('retries on the fallback model when the first cartoon is incomplete, then reports 502', async () => {
      await boot(
        standardResponder({
          onRequest: (_request, index) =>
            index === 0 ? chatCompletion(JSON.stringify(modelCartoon({ language_trap: { english: '' } }))) : undefined,
        }),
      );
      const recovered = await generate();
      expect(recovered.status).toBe(200);
      expect(recovered.cartoon.claims).toHaveLength(3);
      expect(recovered.modelCalls).toBe(2);
      expect(recovered.meta.modelUsed).toContain('minimax');

      mock!.setResponder(() =>
        chatCompletion(JSON.stringify({ claims: [{ type: 'sound', english: 'Only one claim.' }] })),
      );
      const failed = await generate();
      expect(failed.status).toBe(502);
      expect(failed.payload).toEqual({
        error: 'The model did not return a complete three-claim cartoon. Please try again.',
      });
      expect(failed.modelCalls).toBe(2);
    });

    it('normalises junk chips and pads to exactly three usable follow-up chips', async () => {
      await boot(
        standardResponder({
          cartoonOutput: () => ({
            ...modelCartoon(),
            followUpChips: [
              { id: '', label: 'Most picked the wrong claim', nextActionMode: 'RESET', targetStrategy: 'week7' },
              { id: 'x', label: '', nextActionMode: 'reset' },
              { id: 'y', label: 'Make a cartoon', nextActionMode: 'prep_card', targetStrategy: 'S6' },
            ],
            sentenceStems: ['I agree with ___.'],
          }),
        }),
      );
      const { cartoon } = await generate();
      // reset (normalised) + diagnose (prep_card is not a chip mode) + the default firm_up chip.
      expect(cartoon.followUpChips).toHaveLength(3);
      expect(cartoon.followUpChips[0]).toMatchObject({ id: 'chip_1', nextActionMode: 'reset', targetStrategy: 'S5' });
      expect(cartoon.followUpChips[0].label).toBe('Most picked the wrong claim');
      expect(cartoon.followUpChips[1]).toMatchObject({ id: 'y', nextActionMode: 'diagnose', targetStrategy: 'S6' });
      expect(cartoon.followUpChips[2]).toMatchObject({ id: 'chip_l1_bridge', targetStrategy: 'S3', nextActionMode: 'firm_up' });
      expect(cartoon.followUpChips.every((chip) => chip.promptContext.length > 0)).toBe(true);
      expect(cartoon.sentenceStems).toHaveLength(4);
      expect(cartoon.sentenceStems[0]).toBe('I agree with ___.');
    });
  });

  describe('input validation, spotlight, and statelessness', () => {
    it('requires a topic (3+ characters) and caps its length', async () => {
      await boot();
      expect((await generate({ topic: '   ' })).status).toBe(400);
      expect((await generate({ topic: 'a ' })).status).toBe(400);
      const capped = await generate({ topic: 'x'.repeat(500) });
      expect(capped.status).toBe(200);
      expect(capped.cartoon.topic).toHaveLength(300);
      expect(capped.modelCalls).toBe(1);
    });

    it('never calls the model without an API key', async () => {
      await boot();
      await teardown();
      mock = await startMockLlm();
      server = await startTestServer({
        LLM_PROVIDER: 'openai-compatible',
        LLM_BASE_URL: `${mock.url}/v1/chat/completions`,
        LLM_API_KEY: '',
      });
      const response = await postJson(server.baseUrl, '/api/concept-cartoon', TOPIC);
      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({ error: expect.stringContaining('Missing LLM API key') });
      expect(mock.requests).toHaveLength(0);
    });

    it('passes the teacher focus and spotlight to the model and echoes the strategy', async () => {
      await boot();
      const { cartoon, meta, request } = await generate({
        ...TOPIC,
        teacherFocus: 'They say "melting" for evaporation.',
        activeStrategy: 's6',
        yearLevel: '4',
        subject: 'science',
        dominantLanguage: 'iban',
      });
      expect(systemPromptOf(request!)).toContain('ACTIVE STRATEGY SPOTLIGHT: S6');
      const userPrompt = (request!.body.messages as Array<{ role: string; content: string }>).at(-1)?.content ?? '';
      expect(userPrompt).toContain(`Teacher's topic: ${GOLD_CARTOON_TOPIC}`);
      expect(userPrompt).toContain('Teacher\'s focus (optional; may be EN/MS/Iban): They say "melting" for evaporation.');
      expect(userPrompt).toContain('Core 6 Strategy spotlight: S6');
      expect(cartoon.activeStrategy).toBe('S6');
      expect(meta.strategy).toMatchObject({ id: 'S6', name: 'Competing Claims & What-If Transfer (Concept Cartoons)' });
    });

    it('is stateless: repeated requests are fresh and nothing is written to the disk cache', async () => {
      await boot();
      const first = await generate();
      const second = await generate();
      expect(first.meta.fromCache).toBe(false);
      expect(second.meta.fromCache).toBe(false);
      expect(first.modelCalls + second.modelCalls).toBe(2);
      expect(await fileExists(`${server!.dataDir}/${CACHE_FILE}`)).toBe(false);
    });

    it('surfaces provider errors to the client', async () => {
      await boot(() => llmError(429, 'Rate limit reached.'));
      const failed = await generate();
      expect(failed.status).toBe(500);
      expect(failed.payload).toEqual({ error: 'Rate limit reached.' });
    });
  });
});
