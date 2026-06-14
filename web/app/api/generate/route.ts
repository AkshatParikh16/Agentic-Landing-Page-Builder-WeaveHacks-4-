import { NextRequest } from 'next/server';
import { runPipeline } from '@/lib/orchestrator';
import type { PipelineEvent } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { prompt, answers } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      async function withKeepalive<T>(fn: () => Promise<T>): Promise<T> {
        const interval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch {
            /* stream closed */
          }
        }, 15_000);
        try {
          return await fn();
        } finally {
          clearInterval(interval);
        }
      }

      try {
        const { html, finalScore, iterations } = await withKeepalive(() =>
          runPipeline(prompt, answers ?? {}, send)
        );

        send({
          agent: 'DONE',
          status: 'done',
          html,
          output: { finalScore, iterations },
        });
      } catch (err) {
        send({ agent: 'ERROR', status: 'error', message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
