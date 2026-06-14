import { loadAgent } from './agent-loader';
import { getOpenAIClient } from './openai-client';
import { traced } from './tracer';
import type {
  CEOPlan,
  DevOpsOutput,
  EvaluationResult,
  PMOutput,
  RetryDecision,
} from './types';

const SCORE_PASS = Number(process.env.EVAL_PASS_SCORE ?? 8);
const MAX_ITERATIONS = Number(process.env.MAX_IMPROVE_ITERATIONS ?? 2);

export { SCORE_PASS, MAX_ITERATIONS };

// ── CEO ───────────────────────────────────────────────────────────────────────

export const runCEO = traced('CEO', async function CEO(
  prompt: string,
  answers: Record<string, string>
): Promise<CEOPlan> {
  const ceoContext = loadAgent('CEO');
  const { loadAllAgents } = await import('./agent-loader');
  const agentRoster = loadAllAgents();
  const answersText = Object.entries(answers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const openai = getOpenAIClient();
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${ceoContext}\n\n---\n\n## Available Agent Roster\n${agentRoster}\n\nReturn a valid JSON object matching your Output specification.`,
      },
      {
        role: 'user',
        content: `Product description:\n${prompt}\n\nOnboarding answers:\n${answersText}`,
      },
    ],
  });

  return JSON.parse(res.choices[0].message.content ?? '{}') as CEOPlan;
});

export const runCEORetryDecision = traced('CEO', async function CEORetryDecision(
  evaluation: EvaluationResult,
  ceoPlan: CEOPlan,
  iteration: number
): Promise<RetryDecision> {
  const openai = getOpenAIClient();
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are the CEO orchestrator. The Evaluator scored the landing page ${evaluation.score}/10 (pass threshold: ${SCORE_PASS}).
Iteration ${iteration} of ${MAX_ITERATIONS}.

Decide whether to assign ONE sub-agent to improve the output, or accept it as-is.

Return JSON:
{
  "retry": true | false,
  "agent": "Design" | "Dev" | null,
  "task": "<precise improvement task for the agent>",
  "reason": "<why this agent should fix it>"
}

Rules:
- If score >= ${SCORE_PASS}, set retry: false.
- Prefer Dev for copy, layout, responsiveness, missing sections.
- Prefer Design for color, typography, visual mood issues.
- Only assign agents from: ${ceoPlan.activatedAgents.join(', ')}.`,
      },
      {
        role: 'user',
        content: `Product: ${ceoPlan.productName}
Success criteria: ${ceoPlan.successCriteria}
Evaluator feedback: ${evaluation.feedback}
Improvements: ${JSON.stringify(evaluation.improvements)}`,
      },
    ],
  });

  const parsed = JSON.parse(res.choices[0].message.content ?? '{"retry":false}');
  if (!parsed.retry) return null;
  const agent = parsed.agent === 'Design' ? 'Design' : 'Dev';
  if (!ceoPlan.activatedAgents.includes(agent)) return null;
  return {
    agent,
    task: String(parsed.task ?? evaluation.feedback),
    reason: String(parsed.reason ?? 'Quality below threshold'),
  };
});

// ── PM ────────────────────────────────────────────────────────────────────────

export const runPM = traced('PM', async function PM(
  ceoPlan: CEOPlan,
  prompt: string,
  answers: Record<string, string>
): Promise<PMOutput> {
  const pmContext = loadAgent('PM');
  const answersText = Object.entries(answers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const openai = getOpenAIClient();
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${pmContext}\n\n---\n\nReturn a valid JSON object. IMPORTANT: the "prd" field must be a plain text string — not a nested object or JSON. Write it as a multi-paragraph document inside the string value. Only activate sub-agents from: ${ceoPlan.activatedAgents.join(', ')}.`,
      },
      {
        role: 'user',
        content: `CEO task: ${ceoPlan.pmTask}

Strategic Brief:
- Product: ${ceoPlan.productName}
- Audience: ${ceoPlan.targetAudience}
- Tone: ${ceoPlan.tone}
- Value props: ${ceoPlan.valueProps.join(' | ')}
- Hero: ${ceoPlan.heroHeadline}
- CTA: ${ceoPlan.ctaText}
- Sections: ${ceoPlan.sections.join(', ')}
- Success criteria: ${ceoPlan.successCriteria}

Original prompt: ${prompt}
Answers: ${answersText}`,
      },
    ],
  });

  const raw = JSON.parse(res.choices[0].message.content ?? '{}');
  const prd = typeof raw.prd === 'string' ? raw.prd : JSON.stringify(raw.prd ?? '');

  return { ...raw, prd } as PMOutput;
});

// ── Design ────────────────────────────────────────────────────────────────────

export const runDesign = traced('Design', async function Design(
  ceoPlan: CEOPlan,
  pmOutput: PMOutput,
  feedback?: string
): Promise<string> {
  const designContext = loadAgent('Design');

  const openai = getOpenAIClient();
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `${designContext}\n\n---\n\nReturn plain text. Be specific with hex codes and CSS values.`,
      },
      {
        role: 'user',
        content: `PM task: ${pmOutput.designTask}

Product: ${ceoPlan.productName}
Audience: ${ceoPlan.targetAudience}
Tone: ${ceoPlan.tone}
Sections: ${ceoPlan.sections.join(', ')}${feedback ? `\n\nEVALUATOR / CEO IMPROVEMENT REQUEST:\n${feedback}` : ''}`,
      },
    ],
  });

  return res.choices[0].message.content ?? '';
});

// ── Dev ───────────────────────────────────────────────────────────────────────

export const runDev = traced('Dev', async function Dev(
  ceoPlan: CEOPlan,
  pmOutput: PMOutput,
  styleSpec: string,
  options?: { feedback?: string; previousHtml?: string }
): Promise<string> {
  const devContext = loadAgent('Dev');

  const retryBlock =
    options?.feedback && options?.previousHtml
      ? `\n\nIMPROVEMENT PASS — address this feedback on the existing HTML:\n${options.feedback}\n\nEXISTING HTML (improve, do not restart from scratch):\n${options.previousHtml.slice(0, 12000)}`
      : options?.feedback
        ? `\n\nIMPROVEMENT PASS:\n${options.feedback}`
        : '';

  const openai = getOpenAIClient();
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8192,
    messages: [
      {
        role: 'system',
        content: `${devContext}\n\n---\n\nReturn ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no code fences, no explanation. STATIC PAGE ONLY: HTML + CSS in <style> — no <script> tags, no JavaScript.`,
      },
      {
        role: 'user',
        content: `PM task: ${pmOutput.devTask}

CEO BRIEF: ${ceoPlan.productName} | ${ceoPlan.targetAudience} | ${ceoPlan.tone}
Headline: ${ceoPlan.heroHeadline}
Copy: ${ceoPlan.heroCopy}
Value props: ${ceoPlan.valueProps.join(' | ')}
CTA: ${ceoPlan.ctaText}
Sections: ${ceoPlan.sections.join(', ')}
Unique angle: ${ceoPlan.uniqueAngle}

PM REQUIREMENTS:
${pmOutput.prd}

DESIGN SPEC:
${styleSpec}${retryBlock}`,
      },
    ],
  });

  return extractHtml(res.choices[0].message.content ?? '');
});

function extractHtml(raw: string): string {
  const start = raw.search(/<!doctype\s+html/i);
  if (start >= 0) return raw.slice(start).replace(/```\s*$/i, '').trim();
  return raw.replace(/^```(?:html)?\n?/i, '').replace(/```\s*$/i, '').trim();
}

// ── DevOps ────────────────────────────────────────────────────────────────────

export const runDevOps = traced('DevOps', async function DevOps(
  ceoPlan: CEOPlan,
  pmOutput: PMOutput,
  html: string
): Promise<DevOpsOutput> {
  const devopsContext = loadAgent('DevOps');

  const openai = getOpenAIClient();
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${devopsContext}\n\n---\n\nReturn JSON: { "deploymentGuide": string, "configFiles": [{ "filename": string, "content": string }], "envVars": string[] }`,
      },
      {
        role: 'user',
        content: `PM task: ${pmOutput.devopsTask}
Product: ${ceoPlan.productName}
HTML artifact length: ${html.length} chars
Provide static hosting deployment (Netlify or Vercel) for a single index.html file.`,
      },
    ],
  });

  const parsed = JSON.parse(res.choices[0].message.content ?? '{}');
  return {
    deploymentGuide: String(parsed.deploymentGuide ?? ''),
    configFiles: Array.isArray(parsed.configFiles) ? parsed.configFiles : [],
    envVars: Array.isArray(parsed.envVars) ? parsed.envVars : [],
  };
});

// ── Evaluator ─────────────────────────────────────────────────────────────────

export const runEvaluator = traced('Evaluator', async function Evaluator(
  html: string,
  ceoPlan: CEOPlan,
  iteration: number
): Promise<EvaluationResult> {
  const openai = getOpenAIClient();
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a landing page quality evaluator (Judge Agent). Return JSON:
{
  "score": <1-10>,
  "feedback": "<specific improvements>",
  "improvements": [{ "area": string, "responsibleAgent": "Design"|"Dev", "priority": "high"|"medium"|"low" }],
  "passed": <true if score >= ${SCORE_PASS}>
}
Score criteria: visual quality (3pts) + copy quality (3pts) + section completeness (2pts) + mobile responsiveness (2pts).
Do not penalize the page for lacking JavaScript — static HTML/CSS is the goal.
Success criteria: ${ceoPlan.successCriteria}
Pass threshold: ${SCORE_PASS}/10. Iteration: ${iteration}.`,
      },
      {
        role: 'user',
        content: `Evaluate "${ceoPlan.productName}". Required sections: ${ceoPlan.sections.join(', ')}. Tone: ${ceoPlan.tone}. HTML length: ${html.length} chars.\n\n${html.slice(0, 4000)}`,
      },
    ],
  });

  const parsed = JSON.parse(res.choices[0].message.content ?? '{"score":7,"feedback":"","improvements":[]}');
  const score = Number(parsed.score ?? 7);
  return {
    score,
    feedback: String(parsed.feedback ?? ''),
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    passed: score >= SCORE_PASS,
  };
});
