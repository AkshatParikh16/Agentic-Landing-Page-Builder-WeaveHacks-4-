import * as weave from 'weave';

let initPromise: Promise<unknown> | null = null;
let tracingReady = false;

const PROJECT = process.env.WEAVE_PROJECT ?? 'landing-page-builder';

/**
 * Initialize W&B Weave once per process. Safe to call multiple times.
 * Pipeline awaits this so ops are traced from the first agent call.
 */
export async function ensureTracing(): Promise<boolean> {
  if (tracingReady) return true;
  if (!process.env.WANDB_API_KEY?.trim()) return false;

  if (!initPromise) {
    const init = weave
      .init(PROJECT)
      .then(() => {
        tracingReady = true;
        return true;
      })
      .catch(() => false);
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000));
    initPromise = Promise.race([init, timeout]);
  }
  const ok = await initPromise;
  tracingReady = Boolean(ok);
  return tracingReady;
}

/**
 * Wraps fn with weave.op() so inputs/outputs appear in the W&B dashboard.
 */
export function traced<A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  try {
    return weave.op(fn, { name }) as (...args: A) => Promise<R>;
  } catch {
    return fn;
  }
}

/** Log structured metadata for a pipeline run (visible in Weave traces). */
export const logPipelineRun = traced(
  'pipeline_run',
  async function logPipelineRun(meta: Record<string, unknown>): Promise<Record<string, unknown>> {
    return meta;
  }
);
