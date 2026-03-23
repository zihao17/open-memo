/**
 * NotifierRouter
 * Routes notifications to appropriate notifiers based on channel configuration
 */
import type { NotificationChannel, NotifyPayload } from "@open-memo/shared";
import { SystemNotifier } from "./system";
import { BrowserNotifier } from "./browser";
import { AiChatNotifier } from "./ai-chat";

export interface NotifierRouterConfig {
  system?: { enabled: boolean };
  browser?: { enabled: boolean };
  aiChat?: { enabled: boolean };
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

/**
 * NotifierRouter routes NotifyPayload to appropriate notifier(s)
 * based on the channel field and registered notifiers
 */
export class NotifierRouter {
  private readonly systemNotifier: SystemNotifier;
  private readonly browserNotifier: BrowserNotifier;
  private readonly aiChatNotifier: AiChatNotifier;

  constructor(config: NotifierRouterConfig = {}) {
    this.systemNotifier = new SystemNotifier(config.system ?? { enabled: true });
    this.browserNotifier = new BrowserNotifier(config.browser ?? { enabled: true });
    this.aiChatNotifier = new AiChatNotifier(config.aiChat ?? { enabled: true });
  }

  /**
   * Route a single notification to the appropriate notifier(s)
   */
  async route(payload: NotifyPayload): Promise<NotificationResult> {
    const { channel } = payload;

    switch (channel) {
      case "system":
        await this.systemNotifier.send(payload);
        return { channel, success: true };

      case "browser":
        await this.browserNotifier.send(payload);
        return { channel, success: true };

      case "ai_chat":
        await this.aiChatNotifier.send(payload);
        return { channel, success: true };

      default: {
        // This should never happen if NotificationChannel is properly maintained
        const _exhaustive: never = channel;
        console.warn(`[NotifierRouter] Unknown channel: ${_exhaustive}`);
        return {
          channel: _exhaustive as NotificationChannel,
          success: false,
          error: `Unknown channel: ${_exhaustive}`,
        };
      }
    }
  }

  /**
   * Route multiple notifications
   */
  async routeBatch(payloads: NotifyPayload[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    for (const payload of payloads) {
      results.push(await this.route(payload));
    }
    return results;
  }

  /**
   * Get the notifier for a specific channel (for direct access if needed)
   */
  getNotifier(channel: NotificationChannel) {
    switch (channel) {
      case "system":
        return this.systemNotifier;
      case "browser":
        return this.browserNotifier;
      case "ai_chat":
        return this.aiChatNotifier;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Get routing summary for debugging
   */
  getSummary(): {
    channels: NotificationChannel[];
    enabled: Record<NotificationChannel, boolean>;
  } {
    return {
      channels: ["system", "browser", "ai_chat"],
      enabled: {
        system: this.systemNotifier.isEnabled(),
        browser: this.browserNotifier.isEnabled(),
        ai_chat: this.aiChatNotifier.isEnabled(),
      },
    };
  }
}
