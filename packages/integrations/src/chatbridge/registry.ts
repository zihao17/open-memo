/**
 * ChatBridgeRegistry
 * Central registry for chat platform adapters
 */
import type { ChatBridgeAdapter, ChatPlatform } from "./types";

export class ChatBridgeRegistry {
  private readonly adapters = new Map<ChatPlatform, ChatBridgeAdapter>();

  /**
   * Register a chat bridge adapter
   */
  register(adapter: ChatBridgeAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      console.warn(
        `[ChatBridgeRegistry] Adapter for platform "${adapter.platform}" already registered. Replacing.`
      );
    }
    this.adapters.set(adapter.platform, adapter);
    console.log(`[ChatBridgeRegistry] Registered adapter for platform: ${adapter.platform}`);
  }

  /**
   * Unregister an adapter
   */
  unregister(platform: ChatPlatform): void {
    this.adapters.delete(platform);
    console.log(`[ChatBridgeRegistry] Unregistered adapter for platform: ${platform}`);
  }

  /**
   * Get adapter for a specific platform
   */
  get(platform: ChatPlatform): ChatBridgeAdapter | undefined {
    return this.adapters.get(platform);
  }

  /**
   * Get all registered platforms
   */
  getRegisteredPlatforms(): ChatPlatform[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check if a platform is registered
   */
  has(platform: ChatPlatform): boolean {
    return this.adapters.has(platform);
  }

  /**
   * Get summary of all registered adapters
   */
  getSummary(): Array<{ platform: ChatPlatform; enabled: boolean }> {
    return Array.from(this.adapters.entries()).map(([platform, adapter]) => ({
      platform,
      enabled: adapter.enabled,
    }));
  }

  /**
   * Create a stub adapter for a given platform (for development/testing)
   */
  createStubAdapter(platform: ChatPlatform): ChatBridgeAdapter {
    return {
      platform,
      enabled: true,
      async sendMessage(channelId: string, content: string) {
        console.log(`[${platform}Stub] Sending to ${channelId}: ${content}`);
      },
      getConfigSchema() {
        return {};
      },
    };
  }
}
