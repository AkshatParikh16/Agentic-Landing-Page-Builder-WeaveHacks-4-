export type AgentName =
  | 'CEO'
  | 'PM'
  | 'Design'
  | 'Dev'
  | 'DevOps'
  | 'Evaluator';

export type AgentStatus = 'waiting' | 'running' | 'done' | 'error';

export type PipelineEvent = {
  agent: AgentName | 'DONE' | 'ERROR';
  status: AgentStatus;
  message?: string;
  ms?: number;
  output?: Record<string, unknown>;
  html?: string;
  resultId?: string;
  htmlLength?: number;
  iteration?: number;
};

export type CEOPlan = {
  productName: string;
  targetAudience: string;
  tone: string;
  valueProps: string[];
  heroHeadline: string;
  heroCopy: string;
  ctaText: string;
  sections: string[];
  uniqueAngle: string;
  activatedAgents: string[];
  pmTask: string;
  successCriteria: string;
};

export type PMOutput = {
  prd: string;
  activatedAgents: string[];
  designTask: string;
  devTask: string;
  devopsTask: string;
};

export type EvaluationResult = {
  score: number;
  feedback: string;
  improvements: Array<{
    area: string;
    responsibleAgent: 'Design' | 'Dev';
    priority: 'high' | 'medium' | 'low';
  }>;
  passed: boolean;
};

export type RetryDecision = {
  agent: 'Design' | 'Dev';
  task: string;
  reason: string;
} | null;

export type DevOpsOutput = {
  deploymentGuide: string;
  configFiles: Array<{ filename: string; content: string }>;
  envVars: string[];
};
