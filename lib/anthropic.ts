import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

// Default model for article generation and chat. Opus 4.7 is best-in-class for
// long-form writing and persona consistency; bump down to Sonnet for cost.
export const MODEL = "claude-opus-4-7";
export const MODEL_FAST = "claude-sonnet-4-6";

// Anthropic's hosted web search tool. The API runs the search; the model
// receives the results and can decide to search again. The SDK's TS types
// model only client-side tools (which require an input_schema), so we cast
// at the call site via WEB_SEARCH_TOOLS.
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search",
  max_uses: 5,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WEB_SEARCH_TOOLS: any = [WEB_SEARCH_TOOL];
