/**
 * Security hardening: the unauthenticated file-write routes stay deleted, open-text and
 * screenshot routes never touch the disk cache, and only the generic routes may cache.
 */
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CACHE_FILE,
  cleanupServer,
  fileExists,
  postJson,
  startMockLlm,
  startTestServer,
  type MockLlm,
  type TestServer,
} from './helpers';
import { standardResponder } from './fixtures';

const ENV = {
  LLM_PROVIDER: 'openai-compatible',
  LLM_API_KEY: 'test-key',
};

const OPEN_TEXT_ROUTES: Array<[route: string, body: Record<string, unknown>, privateText: string]> = [
  [
    '/api/lesson-coach',
    { lessonPlanText: 'Step 1: Teacher explains evaporation for ten minutes.\nStep 2: Pupils read page 12.' },
    'Teacher explains evaporation',
  ],
  ['/api/live-coach', { observation: 'My Year 4s are silent and the English is too hard.' }, 'Year 4s are silent'],
  ['/api/concept-cartoon', { topic: 'Evaporation — why do wet clothes dry in the sun?' }, 'wet clothes'],
];

describe('deleted unauthenticated file-write routes', () => {
  let mock: MockLlm;
  let server: TestServer;

  beforeAll(async () => {
    mock = await startMockLlm();
    server = await startTestServer({ ...ENV, LLM_BASE_URL: `${mock.url}/v1/chat/completions` });
  });

  afterAll(async () => {
    await cleanupServer(server);
    await mock.close();
  });

  it('answers /api/save-image and /api/check-image with a JSON 404 on every method', async () => {
    const attempts: Array<[method: string, route: string, body?: unknown]> = [
      ['POST', '/api/save-image', { filename: '../../server.js', imageData: 'data:image/png;base64,AAAA' }],
      ['POST', '/api/save-image', { filename: 'x.png', image: 'data:image/png;base64,AAAA' }],
      ['PUT', '/api/save-image', { filename: 'x.png' }],
      ['DELETE', '/api/save-image'],
      ['GET', '/api/check-image?filename=test.jpg'],
      ['POST', '/api/check-image', { filename: 'test.jpg' }],
    ];
    for (const [method, route, body] of attempts) {
      const response = await fetch(`${server.baseUrl}${route}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      expect(response.status, `${method} ${route}`).toBe(404);
      expect(response.headers.get('content-type'), `${method} ${route}`).toContain('application/json');
      expect(await response.json(), `${method} ${route}`).toEqual({ error: 'Not found.' });
    }
    expect(mock.requests).toHaveLength(0);
  });

  it('returns a JSON 404 for any other unknown API route', async () => {
    const response = await postJson(server.baseUrl, '/api/does-not-exist', { foo: 'bar' });
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('rejects malformed JSON without crashing the process', async () => {
    const malformed = await fetch(`${server.baseUrl}/api/lesson-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"lessonPlanText": ',
    });
    expect(malformed.status).toBe(400);
    expect(server.proc.exitCode).toBeNull();
    const recovered = await postJson(server.baseUrl, '/api/lesson-coach', { lessonPlanText: 'Step 1: Ask a question.' });
    expect(recovered.status).toBe(200);
  });
});

describe('zero server-side retention on open-text and screenshot routes', () => {
  let mock: MockLlm;
  let server: TestServer;
  let cachePath: string;

  beforeAll(async () => {
    mock = await startMockLlm(standardResponder());
    server = await startTestServer({ ...ENV, LLM_BASE_URL: `${mock.url}/v1/chat/completions` });
    cachePath = `${server.dataDir}/${CACHE_FILE}`;
  });

  afterAll(async () => {
    await cleanupServer(server);
    await mock.close();
  });

  it('never writes lesson-plan text, live observations, or cartoon topics to the disk cache', async () => {
    for (const [route, body] of OPEN_TEXT_ROUTES) {
      const first = await postJson(server.baseUrl, route, { ...body, activeStrategy: 'S4' });
      expect(first.status, route).toBe(200);
      expect((await first.json()).meta.fromCache, route).toBe(false);
      // Repeating the identical request is still a fresh model call: nothing was retained.
      const again = await postJson(server.baseUrl, route, body);
      expect((await again.json()).meta.fromCache, route).toBe(false);
    }
    expect(await fileExists(cachePath)).toBe(false);
    expect(mock.requests).toHaveLength(OPEN_TEXT_ROUTES.length * 2);
  });

  it('caches only the generic routes, with the strategy inside the cache key', async () => {
    const primerBody = {
      words: ['habitat', 'shelter'],
      yearLevel: '4',
      subject: 'science',
      dominantLanguage: 'iban',
    };
    const cacheEntries = async () => Object.keys(JSON.parse(await readFile(cachePath, 'utf8')));

    const first = await (await postJson(server.baseUrl, '/api/primer', primerBody)).json();
    expect(first.meta.fromCache).toBe(false);
    expect(first.meta.strategy).toBeNull();
    expect(await fileExists(cachePath)).toBe(true);
    expect(await cacheEntries()).toHaveLength(1);

    // Nothing the open-text routes sent may appear anywhere in the cache file.
    const cachedText = await readFile(cachePath, 'utf8');
    for (const [, , privateText] of OPEN_TEXT_ROUTES) {
      expect(cachedText).not.toContain(privateText);
    }

    expect((await (await postJson(server.baseUrl, '/api/primer', primerBody)).json()).meta.fromCache).toBe(true);

    // A different strategy is a different plan: never served from the no-strategy entry.
    const s3Body = { ...primerBody, activeStrategy: 'S3' };
    const s3 = await (await postJson(server.baseUrl, '/api/primer', s3Body)).json();
    expect(s3.meta.fromCache).toBe(false);
    expect(s3.meta.strategy).toMatchObject({ id: 'S3' });
    const s3Again = await (await postJson(server.baseUrl, '/api/primer', s3Body)).json();
    expect(s3Again.meta.fromCache).toBe(true);
    expect(s3Again.meta.strategy).toMatchObject({ id: 'S3' });

    const plan = await (
      await postJson(server.baseUrl, '/api/talk-move-plan', {
        question: 'Why is the river muddy after rain?',
        vocabulary: ['river', 'mud'],
      })
    ).json();
    expect(plan.meta.fromCache).toBe(false);
    expect(await cacheEntries()).toHaveLength(3);
  });
});

describe('HTTP security headers, healthcheck, and per-IP rate limiting', () => {
  let mock: MockLlm;
  let server: TestServer;

  beforeAll(async () => {
    mock = await startMockLlm(standardResponder());
    server = await startTestServer({
      ...ENV,
      LLM_BASE_URL: `${mock.url}/v1/chat/completions`,
      API_RATE_LIMIT_MAX: '2',
      API_RATE_LIMIT_WINDOW_MS: '60000',
    });
  });

  afterAll(async () => {
    await cleanupServer(server);
    await mock.close();
  });

  it('serves /api/health with baseline security headers and no secrets or x-powered-by', async () => {
    const response = await fetch(`${server.baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body).toEqual({ ok: true, provider: 'openai-compatible' });
    expect(JSON.stringify(body)).not.toContain('test-key');
  });

  it('rate-limits repeated AI POST requests per IP with HTTP 429', async () => {
    const body = { topic: 'Why do shadows change size during the day?' };
    const first = await postJson(server.baseUrl, '/api/concept-cartoon', body);
    const second = await postJson(server.baseUrl, '/api/concept-cartoon', body);
    const third = await postJson(server.baseUrl, '/api/concept-cartoon', body);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.headers.get('retry-after')).toBeTruthy();
    expect(await third.json()).toMatchObject({ error: expect.stringContaining('Too many requests') });
  });
});
