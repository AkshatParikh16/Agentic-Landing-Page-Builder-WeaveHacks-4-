export function getOpenAIKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function requireOpenAIKey(): string {
  const key = getOpenAIKey();
  if (!key) {
    throw new Error(
      'OPENAI_API_KEY is missing. Add it to web/.env.local and restart the dev server (npm run dev).'
    );
  }
  if (!key.startsWith('sk-')) {
    throw new Error(
      'OPENAI_API_KEY looks invalid (should start with sk-). Check web/.env.local and restart.'
    );
  }
  return key;
}

export function getEnvStatus() {
  const openaiKey = getOpenAIKey();
  return {
    openai: {
      configured: Boolean(openaiKey),
      validFormat: openaiKey?.startsWith('sk-') ?? false,
    },
    wandb: {
      configured: Boolean(process.env.WANDB_API_KEY?.trim()),
    },
  };
}
