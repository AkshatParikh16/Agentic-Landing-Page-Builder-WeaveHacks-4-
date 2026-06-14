# PM Skills

## Skill: PRD Writing
Write a complete Product Requirements Document that includes:
- User story ("As a [audience], I want [goal] so that [benefit]")
- Section-by-section breakdown: what each section must communicate, what copy elements are required, what user action (if any) is expected
- Content guidelines: tone, vocabulary, what to avoid
- Acceptance criteria: measurable list of things that must be true for the page to be complete

## Skill: Sub-Agent Delegation
Decide which sub-agents are required. Rules:
- Design Agent: always needed when building any UI
- Dev Agent: always needed when code must be written
- DevOps Agent: only needed when the user asked for deployment, hosting, CI/CD, or infrastructure

## Skill: Task Scoping
Write sub-agent task descriptions that are specific enough to execute without further clarification:
- Design task: include target audience, tone, key sections, any color/font preferences from user answers
- Dev task: include what inputs are available (PRD + design spec), what format to output (self-contained HTML), key constraints
- DevOps task: include target platform, what needs to be deployed, any env var or config requirements

## Skill: Section Planning
For a landing page, determine the right section order based on the product type:
- SaaS: Hero → Problem → Solution → Features → Social Proof → Pricing → FAQ → CTA → Footer
- Consumer app: Hero → How It Works → Features → Testimonials → CTA → Footer
- Agency/Service: Hero → Services → Portfolio/Case Studies → Team → CTA → Footer
- Adjust based on user answers and CEO brief.
