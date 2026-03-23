/**
 * OpenAI-compatible provider adapter stub
 * Supports any API that follows OpenAI's chat completions format
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

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel?: string;
}

export class OpenAICompatibleAdapter implements ProviderAdapter {
  constructor(private readonly config: OpenAICompatibleConfig) {}

  async generateStructured<TResult, TSchema = unknown>(
    _request: ProviderStructuredRequest<TSchema>
  ): Promise<TResult> {
    // TODO: Implement actual API call when integrating
    // For now, return a stub result
    console.log("[OpenAICompatibleAdapter] generateStructured called (stub)");
    return {} as TResult;
  }

  async chatWithTools(
    _request: ProviderChatRequest,
    _toolResults?: ProviderToolResult[]
  ): Promise<ProviderChatResponse> {
    // TODO: Implement actual API call when integrating
    // For now, return a stub response
    console.log("[OpenAICompatibleAdapter] chatWithTools called (stub)");
    return {
      message: "This is a stub response from OpenAICompatibleAdapter",
    };
  }

  // Helper method for testing
  getConfig(): Readonly<OpenAICompatibleConfig> {
    return { ...this.config };
  }
}
