import {
  runCEO,
  runCEORetryDecision,
  runPM,
  runDesign,
  runDev,
  runDevOps,
  runEvaluator,
  MAX_ITERATIONS,
} from './agents';
import { ensureTracing, logPipelineRun } from './tracer';
import type { CEOPlan, PipelineEvent } from './types';

export type EventEmitter = (event: PipelineEvent) => void;

function emitDone(
  emit: EventEmitter,
  agent: PipelineEvent['agent'],
  ms: number,
  output: Record<string, unknown>,
  iteration = 0
) {
  emit({ agent, status: 'done', ms, output, iteration });
}

/**
 * Full agentic pipeline: CEO → PM → Design → Dev → [DevOps] → Evaluator
 * with CEO-driven improvement loop when score is below threshold.
 */
export async function runPipeline(
  prompt: string,
  answers: Record<string, string>,
  emit: EventEmitter
): Promise<{ html: string; finalScore: number; iterations: number }> {
  const tracingOk = await ensureTracing();
  await logPipelineRun({
    promptPreview: prompt.slice(0, 200),
    answerCount: Object.keys(answers).length,
    tracingEnabled: tracingOk,
    maxIterations: MAX_ITERATIONS,
  });

  // ── CEO ────────────────────────────────────────────────────────────────────
  emit({ agent: 'CEO', status: 'running', message: 'Analyzing prompt, selecting agents…', iteration: 0 });
  const tCeo = Date.now();
  const ceoPlan = await runCEO(prompt, answers);
  emitDone(emit, 'CEO', Date.now() - tCeo, {
    productName: ceoPlan.productName,
    targetAudience: ceoPlan.targetAudience,
    tone: ceoPlan.tone,
    heroHeadline: ceoPlan.heroHeadline,
    valueProps: ceoPlan.valueProps,
    ctaText: ceoPlan.ctaText,
    sections: ceoPlan.sections,
    activatedAgents: ceoPlan.activatedAgents,
    successCriteria: ceoPlan.successCriteria,
  });

  // ── PM ─────────────────────────────────────────────────────────────────────
  emit({ agent: 'PM', status: 'running', message: 'Writing PRD, delegating to sub-agents…', iteration: 0 });
  const tPm = Date.now();
  const pmOutput = await runPM(ceoPlan, prompt, answers);
  emitDone(emit, 'PM', Date.now() - tPm, {
    activatedAgents: pmOutput.activatedAgents,
    designTask: pmOutput.designTask,
    devTask: pmOutput.devTask,
    devopsTask: pmOutput.devopsTask || '(not activated)',
    prdPreview: pmOutput.prd.slice(0, 400) + (pmOutput.prd.length > 400 ? '…' : ''),
  });

  const activatedAgents = pmOutput.activatedAgents ?? ceoPlan.activatedAgents ?? ['Design', 'Dev'];
  let styleSpec = 'Clean modern design with strong contrast and clear typography.';
  let html = '';
  let devOpsArtifacts: Record<string, unknown> | undefined;

  // ── Design ─────────────────────────────────────────────────────────────────
  if (activatedAgents.includes('Design')) {
    emit({ agent: 'Design', status: 'running', message: 'Defining palette, typography, layout…', iteration: 0 });
    const tDesign = Date.now();
    styleSpec = await runDesign(ceoPlan, pmOutput);
    emitDone(emit, 'Design', Date.now() - tDesign, {
      specPreview: styleSpec.slice(0, 400) + (styleSpec.length > 400 ? '…' : ''),
    });
  } else {
    emit({
      agent: 'Design',
      status: 'done',
      message: 'Skipped — not activated for this run',
      output: { skipped: true },
      iteration: 0,
    });
  }

  // ── Dev ────────────────────────────────────────────────────────────────────
  if (activatedAgents.includes('Dev')) {
    emit({ agent: 'Dev', status: 'running', message: 'Building self-contained HTML (~60–90s)…', iteration: 0 });
    const tDev = Date.now();
    html = await runDev(ceoPlan, pmOutput, styleSpec);
    emitDone(emit, 'Dev', Date.now() - tDev, {
      htmlLength: html.length,
      preview: html.slice(0, 200) + '…',
    });
  } else {
    throw new Error('Dev agent must be activated to produce a landing page.');
  }

  // ── DevOps (optional) ──────────────────────────────────────────────────────
  if (activatedAgents.includes('DevOps') && pmOutput.devopsTask) {
    emit({ agent: 'DevOps', status: 'running', message: 'Preparing deployment config…', iteration: 0 });
    const tDevOps = Date.now();
    const devOps = await runDevOps(ceoPlan, pmOutput, html);
    devOpsArtifacts = {
      deploymentGuidePreview: devOps.deploymentGuide.slice(0, 300) + '…',
      configFiles: devOps.configFiles.map((f) => f.filename),
      envVars: devOps.envVars,
    };
    emitDone(emit, 'DevOps', Date.now() - tDevOps, devOpsArtifacts);
  } else {
    emit({
      agent: 'DevOps',
      status: 'done',
      message: 'Skipped — static page only',
      output: { skipped: true },
      iteration: 0,
    });
  }

  // ── Evaluator + improvement loop ─────────────────────────────────────────
  let iteration = 1;
  let finalScore = 0;
  let evaluation = await evaluateAndEmit(emit, html, ceoPlan, iteration);

  finalScore = evaluation.score;

  while (!evaluation.passed && iteration < MAX_ITERATIONS) {
    iteration += 1;

    emit({
      agent: 'CEO',
      status: 'running',
      message: `Score ${evaluation.score}/10 — deciding improvements (pass ${iteration})…`,
      iteration,
    });
    const tRetryCeo = Date.now();
    const decision = await runCEORetryDecision(evaluation, ceoPlan, iteration);
    emitDone(
      emit,
      'CEO',
      Date.now() - tRetryCeo,
      decision
        ? { action: 'retry', agent: decision.agent, reason: decision.reason, task: decision.task }
        : { action: 'accept', reason: 'No further improvements assigned' },
      iteration
    );

    if (!decision) break;

    if (decision.agent === 'Design' && activatedAgents.includes('Design')) {
      emit({
        agent: 'Design',
        status: 'running',
        message: `Revision ${iteration}: ${decision.reason}`,
        iteration,
      });
      const tDesign = Date.now();
      styleSpec = await runDesign(ceoPlan, pmOutput, decision.task);
      emitDone(
        emit,
        'Design',
        Date.now() - tDesign,
        { specPreview: styleSpec.slice(0, 400) + '…', revision: iteration },
        iteration
      );
    }

    if (decision.agent === 'Dev' || decision.agent === 'Design') {
      emit({
        agent: 'Dev',
        status: 'running',
        message: `Revision ${iteration}: applying improvements…`,
        iteration,
      });
      const tDev = Date.now();
      html = await runDev(ceoPlan, pmOutput, styleSpec, {
        feedback: decision.task,
        previousHtml: html,
      });
      emitDone(
        emit,
        'Dev',
        Date.now() - tDev,
        { htmlLength: html.length, revision: iteration },
        iteration
      );
    }

    evaluation = await evaluateAndEmit(emit, html, ceoPlan, iteration);
    finalScore = evaluation.score;
  }

  await logPipelineRun({
    finalScore,
    iterations: iteration,
    htmlLength: html.length,
    devOpsIncluded: Boolean(devOpsArtifacts),
  });

  return { html, finalScore, iterations: iteration };
}

async function evaluateAndEmit(
  emit: EventEmitter,
  html: string,
  ceoPlan: CEOPlan,
  iteration: number
) {
  emit({
    agent: 'Evaluator',
    status: 'running',
    message: iteration > 1 ? `Re-scoring after revision ${iteration}…` : 'Judging quality (visual, copy, completeness)…',
    iteration,
  });
  const tEval = Date.now();
  const evaluation = await runEvaluator(html, ceoPlan, iteration);
  emitDone(
    emit,
    'Evaluator',
    Date.now() - tEval,
    {
      score: evaluation.score,
      passed: evaluation.passed,
      feedback: evaluation.feedback,
      improvements: evaluation.improvements,
    },
    iteration
  );
  return evaluation;
}
