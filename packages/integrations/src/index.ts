/**
 * @open-memo/integrations
 *
 * Provides abstractions for:
 * - LLM Provider adapters (OpenAI-compatible, Anthropic, etc.)
 * - Notification routing (System, Browser, AI Chat)
 * - Chat platform bridging (Feishu, Slack, Discord, etc.)
 */

// Bootstrap boundary (from original)
export interface IntegrationsBootstrapBoundary {
  readonly llm: "pending";
  readonly notifier: "pending";
  readonly chatBridge: "pending";
}

export const integrationsBootstrapBoundary: IntegrationsBootstrapBoundary = {
  llm: "pending",
  notifier: "pending",
  chatBridge: "pending",
};

// Re-export shared types used by integrations
export type {
  ProviderAdapter,
  ProviderChatRequest,
  ProviderChatResponse,
  ProviderStructuredRequest,
  ProviderToolCall,
  ProviderToolDefinition,
  ProviderToolResult,
} from "@open-memo/shared";

export type {
  NotifyPayload,
  NotificationChannel,
  NotificationUrgency,
  Task,
  TaskPatch,
  TaskMutation,
} from "@open-memo/shared";

// Provider adapters
export { OpenAICompatibleAdapter } from "./provider/openai-compatible";
export type { OpenAICompatibleConfig } from "./provider/openai-compatible";

export { AnthropicAdapter } from "./provider/anthropic";
export type { AnthropicConfig } from "./provider/anthropic";

// Notifier layer
export { NotifierRouter } from "./notifier/router";
export type { NotifierRouterConfig, NotificationResult } from "./notifier/router";

export { SystemNotifier } from "./notifier/system";
export type { SystemNotifierConfig } from "./notifier/system";

export { BrowserNotifier } from "./notifier/browser";
export type { BrowserNotifierConfig } from "./notifier/browser";

export { AiChatNotifier } from "./notifier/ai-chat";
export type { AiChatNotifierConfig } from "./notifier/ai-chat";

// ChatBridge layer
export { ChatBridgeRegistry } from "./chatbridge/registry";
export type {
  ChatBridgeAdapter,
  ChatBridgeConfig,
  ChatMessage,
  ChatPlatform,
} from "./chatbridge/types";
