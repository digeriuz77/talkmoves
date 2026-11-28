/**
 * Provider-agnostic approved-API adapter: request shape per provider, auth headers, fail-fast
 * startup checks. Runs the real server.js against a local mock LLM endpoint.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupServer,
  runServerUntilExit,
  startMockLlm,
  startTestServer,
  type MockLlm,
  type ServerEnv,
  type TestServer,
} from './helpers';

const PRIMER_BODY = { words: ['habitat', 'shelter'], yearLevel: '4', subject: 'science', dominantLanguage: 'iban' };

/** Env that isolates the adapter from any developer .env file. */
const BASE_ENV: ServerEnv = {
  LLM_PROVIDER: '',
  LLM_BASE_URL: '',
  LLM_API_KEY: '',
  AZURE_OPENAI_ENDPOINT: '',
  AZURE_OPENAI_API_KEY: '',
  AZURE_OPENAI_API_VERSION: '',
  FIREWORKS_API_KEY: '',
  FIREWORKS_BASE_URL: '',
  FIREWORKS_VISION_MODEL: '',
  FIREWORKS_REASONING_MODEL: '',
  FIREWORKS_FALLBACK_MODEL: '',
  VISION_MODEL: '',
  REASONING_MODEL: '',
  FALLBACK_MODEL: '',
  LLM_REASONING_MODEL_PARAMS: '',
};

describe('LLM provider adapter — fail-fast startup', () => {
  it('defaults to azure-openai and refuses to start without an endpoint', async () => {
    const { code, output } = await runServerUntilExit({
      ...BASE_ENV,
      AZURE_OPENAI_API_KEY: 'azure-key',
    });
    expect(code).not.toBe(0);
    expect(output).toMatch(/LLM_PROVIDER "azure-openai" requires AZURE_OPENAI_ENDPOINT/);
    expect(output).toMatch(/LLM_PROVIDER=fireworks/);
  });

  it('refuses to start for a provider that is not on the approved list', async () => {
    const { code, output } = await runServerUntilExit({ ...BASE_ENV, LLM_PROVIDER: 'some-other-llm' });
    expect(code).not.toBe(0);
    expect(output).toMatch(/Unsupported LLM_PROVIDER "some-other-llm"/);
  });

  it('starts for each approved provider when it is configured', async () => {
    for (const provider of ['fireworks', 'openai-compatible']) {
      const server = await startTestServer({
        ...BASE_ENV,
        LLM_PROVIDER: provider,
        LLM_BASE_URL: 'http://127.0.0.1:1/v1/chat/completions',
        LLM_API_KEY: 'test-key',
      });
      await cleanupServer(server);
    }
  });
});

describe('LLM provider adapter — request shape per provider', () => {
  let mock: MockLlm;
  let server: TestServer | null = null;

  beforeAll(async () => {
    mock = await startMockLlm();
  });

  afterAll(async () => {
    await cleanupServer(server);
    await mock.close();
  });

  async function boot(env: ServerEnv) {
    await cleanupServer(server);
    server = null;
    mock.requests.length = 0;
    server = await startTestServer({ ...BASE_ENV, ...env });
    const response = await fetch(`${server.baseUrl}/api/primer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PRIMER_BODY),
    });
    expect(response.status).toBe(200);
    expect(mock.requests).toHaveLength(1);
    return mock.requests[0];
  }

  it('azure-openai: deployment URL, api-key header, no model field, no Fireworks top_k', async () => {
    const request = await boot({
      LLM_PROVIDER: 'azure-openai',
      AZURE_OPENAI_ENDPOINT: `${mock.url}/`,
      AZURE_OPENAI_API_KEY: 'azure-secret',
      AZURE_OPENAI_API_VERSION: '2025-01-01',
      REASONING_MODEL: 'pedagogy-deploy',
    });
    expect(request.method).toBe('POST');
    expect(request.url).toBe(
      '/openai/deployments/pedagogy-deploy/chat/completions?api-version=2025-01-01',
    );
    expect(request.headers['api-key']).toBe('azure-secret');
    expect(request.headers.authorization).toBeUndefined();
    expect(request.body).not.toHaveProperty('model');
    expect(request.body).not.toHaveProperty('top_k');
    expect(request.body).toMatchObject({ max_tokens: 8192, presence_penalty: 0, frequency_penalty: 0 });
    expect(Array.isArray(request.body.messages)).toBe(true);
    // Credentials travel only in the auth header, never in the prompt body.
    expect(JSON.stringify(request.body)).not.toContain('azure-secret');
  });

  it('prefers the Azure key over the generic and Fireworks keys', async () => {
    const request = await boot({
      LLM_PROVIDER: 'azure-openai',
      AZURE_OPENAI_ENDPOINT: mock.url,
      AZURE_OPENAI_API_KEY: 'azure-secret',
      LLM_API_KEY: 'generic-secret',
      FIREWORKS_API_KEY: 'fireworks-secret',
    });
    expect(request.headers['api-key']).toBe('azure-secret');
  });

  it('URL-encodes the deployment name and the api version', async () => {
    const request = await boot({
      LLM_PROVIDER: 'azure-openai',
      AZURE_OPENAI_ENDPOINT: mock.url,
      AZURE_OPENAI_API_KEY: 'azure-secret',
      AZURE_OPENAI_API_VERSION: '2024-10-21&x=1',
      REASONING_MODEL: 'deploy ment/name',
    });
    expect(request.url).toBe(
      '/openai/deployments/deploy%20ment%2Fname/chat/completions?api-version=2024-10-21%26x%3D1',
    );
  });

  it('fireworks: bearer token, model field, and top_k kept (ignores Azure key when both set)', async () => {
    const request = await boot({
      LLM_PROVIDER: 'fireworks',
      FIREWORKS_BASE_URL: `${mock.url}/inference/v1/chat/completions`,
      AZURE_OPENAI_API_KEY: 'azure-secret-should-not-leak',
      FIREWORKS_API_KEY: 'fireworks-secret',
      FIREWORKS_REASONING_MODEL: 'accounts/fireworks/models/test',
    });
    expect(request.url).toBe('/inference/v1/chat/completions');
    expect(request.headers.authorization).toBe('Bearer fireworks-secret');
    expect(request.headers['api-key']).toBeUndefined();
    expect(request.body).toMatchObject({ model: 'accounts/fireworks/models/test', top_k: 40 });
  });

  it('keeps existing Fireworks deployments running when LLM_PROVIDER is unset and only FIREWORKS_API_KEY is set', async () => {
    const request = await boot({
      FIREWORKS_BASE_URL: `${mock.url}/inference/v1/chat/completions`,
      FIREWORKS_API_KEY: 'fireworks-only-secret',
      FIREWORKS_REASONING_MODEL: 'accounts/fireworks/models/test',
    });
    expect(request.url).toBe('/inference/v1/chat/completions');
    expect(request.headers.authorization).toBe('Bearer fireworks-only-secret');
    expect(request.body).toMatchObject({ model: 'accounts/fireworks/models/test', top_k: 40 });
  });

  it('openai-compatible: bearer token and model field, no top_k, honours LLM_BASE_URL', async () => {
    const request = await boot({
      LLM_PROVIDER: 'openai-compatible',
      LLM_BASE_URL: `${mock.url}/zdr/v1/chat/completions`,
      LLM_API_KEY: 'zdr-secret',
      REASONING_MODEL: 'approved-model',
    });
    expect(request.url).toBe('/zdr/v1/chat/completions');
    expect(request.headers.authorization).toBe('Bearer zdr-secret');
    expect(request.body).toMatchObject({ model: 'approved-model' });
    expect(request.body).not.toHaveProperty('top_k');
  });

  it('LLM_REASONING_MODEL_PARAMS=true switches to the reasoning-model request shape', async () => {
    const request = await boot({
      LLM_PROVIDER: 'azure-openai',
      AZURE_OPENAI_ENDPOINT: mock.url,
      AZURE_OPENAI_API_KEY: 'azure-secret',
      LLM_REASONING_MODEL_PARAMS: 'true',
    });
    expect(request.body).toMatchObject({ max_completion_tokens: 8192 });
    expect(request.body).not.toHaveProperty('max_tokens');
    expect(request.body).not.toHaveProperty('presence_penalty');
    expect(request.body).not.toHaveProperty('frequency_penalty');
  });
});

describe('LLM provider adapter — error surfacing', () => {
  let mock: MockLlm | null = null;
  let server: TestServer | null = null;

  afterAll(async () => {
    await cleanupServer(server);
    await mock?.close();
  });

  it('never calls the LLM without an API key and surfaces the provider error', async () => {
    mock = await startMockLlm(() => ({ status: 401, body: { error: { message: 'Access denied.' } } }));
    server = await startTestServer({
      ...BASE_ENV,
      LLM_PROVIDER: 'openai-compatible',
      LLM_BASE_URL: `${mock.url}/v1/chat/completions`,
    });

    const noKey = await fetch(`${server.baseUrl}/api/primer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PRIMER_BODY),
    });
    expect(noKey.status).toBe(500);
    expect(await noKey.json()).toMatchObject({
      error: expect.stringContaining('Missing LLM API key on server'),
    });
    expect(mock.requests).toHaveLength(0);
    await cleanupServer(server);

    server = await startTestServer({
      ...BASE_ENV,
      LLM_PROVIDER: 'openai-compatible',
      LLM_BASE_URL: `${mock.url}/v1/chat/completions`,
      LLM_API_KEY: 'test-key',
    });
    const denied = await fetch(`${server.baseUrl}/api/primer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PRIMER_BODY),
    });
    // Primary model -> fallback model -> both denied -> error passed to the client.
    expect(denied.status).toBe(500);
    expect(await denied.json()).toMatchObject({ error: 'Access denied.' });
    expect(mock.requests).toHaveLength(2);
  });
});
