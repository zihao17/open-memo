/**
 * Anthropic provider adapter stub
 * Supports Anthropic's Claude API format
 */
import type {
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderStructuredRequest,
  ProviderToolResult,
} from "@open-memo/shared";
import type { ProviderAdapter } from "@open-memo/shared";

// Re-export the interface for convenience
export type { ProviderAdapter };

export interface AnthropicConfig {
  apiKey: string;
  defaultModel?: string;
  maxTokens?: number;
}

export class AnthropicAdapter implements ProviderAdapter {
  constructor(private readonly config: AnthropicConfig) {}

  async generateStructured<TResult, TSchema = unknown>(
    _request: ProviderStructuredRequest<TSchema>
  ): Promise<TResult> {
    // TODO: Implement actual API call when integrating
    // Anthropic uses Claude's structured output capabilities
    console.log("[AnthropicAdapter] generateStructured called (stub)");
    return {} as TResult;
  }

  async chatWithTools(
    _request: ProviderChatRequest,
    _toolResults?: ProviderToolResult[]
  ): Promise<ProviderChatResponse> {
    // TODO: Implement actual API call when integrating
    // Note: Anthropic uses tool_use blocks differently from OpenAI
    console.log("[AnthropicAdapter] chatWithTools called (stub)");
    return {
      message: "This is a stub response from AnthropicAdapter",
    };
  }

  // Helper method for testing
  getConfig(): Readonly<AnthropicConfig> {
    return { ...this.config };
  }
}
