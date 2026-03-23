/**
 * System notifier stub
 * Handles system-level notifications (e.g., OS native notifications)
 */
import type { NotifyPayload, NotificationUrgency } from "@open-memo/shared";

export interface SystemNotifierConfig {
  enabled: boolean;
  defaultUrgency?: NotificationUrgency;
}

export class SystemNotifier {
  constructor(private readonly config: SystemNotifierConfig = { enabled: true }) {}

  async send(payload: NotifyPayload): Promise<void> {
    if (!this.config.enabled) {
      console.log("[SystemNotifier] Disabled, skipping notification");
      return;
    }

    // TODO: Implement actual system notification when integrating
    // e.g., Electron notification, Node native notifications, etc.
    console.log(`[SystemNotifier] Sending notification:`);
    console.log(`  Title: ${payload.title}`);
    console.log(`  Body: ${payload.body}`);
    console.log(`  Urgency: ${payload.urgency}`);
    console.log(`  Channel: ${payload.channel}`);
    console.log(`  DedupeKey: ${payload.dedupeKey}`);
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
