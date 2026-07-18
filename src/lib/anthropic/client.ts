import "server-only";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
/** Default model for prompt-writing calls — good balance of quality and cost for structured text generation. */
const DEFAULT_MODEL = "claude-sonnet-5";

export interface ClaudeMessageResult {
  text: string;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

/** Sends a single-turn message to Claude and returns the concatenated text content. */
export async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 2000): Promise<ClaudeMessageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing. Add it to your environment variables in Vercel.");
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) throw new Error("The Claude API key is missing or invalid. Check ANTHROPIC_API_KEY in Settings.");
    if (res.status === 429) throw new Error("Claude is rate-limiting this account right now. Wait a moment and try again.");
    throw new Error(`Claude API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { content?: AnthropicContentBlock[] };
  const text = (data.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("");
  return { text };
}
