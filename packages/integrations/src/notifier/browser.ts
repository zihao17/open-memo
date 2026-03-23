/**
 * Browser notifier stub
 * Handles browser-based notifications (e.g., Web Push, in-app notifications)
 */
import type { NotifyPayload } from "@open-memo/shared";

export interface BrowserNotifierConfig {
  enabled: boolean;
  // Platform-specific config can be added later
  platformConfig?: Record<string, unknown>;
}

export class BrowserNotifier {
  constructor(private readonly config: BrowserNotifierConfig = { enabled: true }) {}

  async send(payload: NotifyPayload): Promise<void> {
    if (!this.config.enabled) {
      console.log("[BrowserNotifier] Disabled, skipping notification");
      return;
    }

    // TODO: Implement actual browser notification when integrating
    // e.g., Web Push API, Notification API, or in-app notification system
    console.log(`[BrowserNotifier] Sending notification:`);
    console.log(`  Title: ${payload.title}`);
    console.log(`  Body: ${payload.body}`);
    console.log(`  Urgency: ${payload.urgency}`);
    console.log(`  Channel: ${payload.channel}`);
    console.log(`  DeepLink: ${payload.deepLink}`);
  }

  async sendBatch(payloads: NotifyPayload[]): Promise<void> {
    for (const payload of payloads) {
      await this.send(payload);
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}
