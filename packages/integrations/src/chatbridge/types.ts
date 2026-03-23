/**
 * ChatBridge types
 * Defines the interface for chat platform adapters
 */
export type ChatPlatform = "feishu" | "slack" | "discord" | "telegram" | "custom";

export interface ChatMessage {
  id: string;
  platform: ChatPlatform;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatBridgeAdapter {
  readonly platform: ChatPlatform;
  readonly enabled: boolean;

  /**
   * Send a message to a specific channel/user
   */
  sendMessage(
    channelId: string,
    content: string,
    options?: { threadId?: string; metadata?: Record<string, unknown> }
  ): Promise<void>;

  /**
   * Get platform-specific configuration schema
   */
  getConfigSchema(): Record<string, unknown>;
}

export interface ChatBridgeConfig {
  platform: ChatPlatform;
  enabled: boolean;
  config: Record<string, unknown>;
}
