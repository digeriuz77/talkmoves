/**
 * Integration-test harness for server.js.
 *
 * Each test boots the REAL server as a child process against a local mock LLM endpoint, so the
 * provider adapter, prompts, sanitizers, and disk-cache behaviour are verified end to end
 * without any network access or API key.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import http, { type IncomingHttpHeaders, type Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CACHE_FILE = 'talk-move-plan-cache-v2.json';

export type RecordedRequest = {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
};

export type MockResponder = (request: RecordedRequest, index: number) => unknown;

export type MockLlm = {
  url: string;
  requests: RecordedRequest[];
  setResponder: (responder: MockResponder) => void;
  close: () => Promise<void>;
};

/** OpenAI-compatible chat completion envelope wrapping `content`. */
export function chatCompletion(content: string) {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 0,
    model: 'mock',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
  };
}

/** A responder returning `{ status, body }` produces an error response instead. */
export function llmError(status: number, message: string) {
  return { status, body: { error: { message } } };
}

export async function startMockLlm(responder: MockResponder = () => chatCompletion('{}')) {
  const requests: RecordedRequest[] = [];
  let current = responder;
  const server: Server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const recorded: RecordedRequest = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: raw ? JSON.parse(raw) : {},
      };
      requests.push(recorded);
      const result = current(recorded, requests.length - 1);
      const isError = Boolean(result && typeof result === 'object' && 'status' in result);
      const status = isError ? Number((result as { status: unknown }).status) : 200;
      const body = isError ? (result as { body: unknown }).body : result;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Mock LLM did not bind a port.');
  return {
    url: `http://127.0.0.1:${address.port}`,
    requests,
    setResponder: (next: MockResponder) => {
      current = next;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  } satisfies MockLlm;
}

/** System prompt of the first chat message, for asserting on prompt content. */
export function systemPromptOf(request: RecordedRequest): string {
  const messages = request.body?.messages as Array<{ role: string; content: unknown }>;
  const system = messages?.find((message) => message.role === 'system');
  return typeof system?.content === 'string' ? system.content : '';
}

/** Everything the model sees as user-turn text (single prompts and multi-turn threads). */
export function userTextOf(request: RecordedRequest): string {
  const messages = request.body?.messages as Array<{ role: string; content: unknown }>;
  return (messages || [])
    .filter((message) => message.role === 'user')
    .map((message) => (typeof message.content === 'string' ? message.content : ''))
    .join('\n');
}

export type TestServer = {
  baseUrl: string;
  dataDir: string;
  proc: ChildProcessWithoutNullStreams;
  output: () => string;
  stop: () => Promise<void>;
};

const START_TIMEOUT_MS = 20_000;

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

export type ServerEnv = Record<string, string | undefined>;

/**
 * Boots server.js with an isolated data directory. Pass explicit values (use '' to blank a
 * variable) for every LLM_* / FIREWORKS_* / AZURE_* setting a test depends on, so a developer's
 * local .env files cannot change the outcome.
 */
export async function startTestServer(env: ServerEnv = {}): Promise<TestServer> {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'talk-moves-test-'));
  const port = await freePort();
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      COACH_DATA_DIR: dataDir,
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  proc.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString('utf8');
  });
  proc.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString('utf8');
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server did not start in time.\n${output}`)), START_TIMEOUT_MS);
    const check = () => {
      if (output.includes('Server running on port')) {
        clearTimeout(timer);
        resolve();
      }
    };
    proc.stdout.on('data', check);
    proc.on('exit', (code, signal) => {
      clearTimeout(timer);
      reject(new Error(`Server exited before listening (code ${code}, signal ${signal}).\n${output}`));
    });
    proc.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    check();
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    dataDir,
    proc,
    output: () => output,
    stop: () =>
      new Promise<void>((resolve) => {
        if (proc.exitCode !== null) {
          resolve();
          return;
        }
        proc.once('exit', () => resolve());
        proc.kill('SIGTERM');
      }),
  };
}

export async function cleanupServer(server: TestServer | null): Promise<void> {
  if (!server) return;
  await server.stop();
  await fs.rm(server.dataDir, { recursive: true, force: true });
}

/** Runs server.js to completion and reports how it exited (for fail-fast startup tests). */
export async function runServerUntilExit(env: ServerEnv = {}): Promise<{ code: number | null; output: string }> {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'talk-moves-test-'));
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: '0', COACH_DATA_DIR: dataDir, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  proc.stdout.on('data', (chunk: Buffer) => {
    output += chunk.toString('utf8');
  });
  proc.stderr.on('data', (chunk: Buffer) => {
    output += chunk.toString('utf8');
  });
  const code = await new Promise<number | null>((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`Server kept running (expected a startup failure).\n${output}`));
    }, START_TIMEOUT_MS);
    proc.once('exit', (exitCode) => {
      clearTimeout(timer);
      resolve(exitCode);
    });
    proc.once('error', reject);
  });
  await fs.rm(dataDir, { recursive: true, force: true });
  return { code, output };
}

export async function postJson(baseUrl: string, route: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fileExists(filePath: string): Promise<boolean> {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}
