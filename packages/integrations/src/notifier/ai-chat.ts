/**
 * AI Chat notifier stub
 * Handles notifications via AI chat interfaces (e.g., embedding in AI responses)
 */
import type { NotifyPayload } from "@open-memo/shared";

export interface AiChatNotifierConfig {
  enabled: boolean;
  includeInAiContext?: boolean; // Whether to include in AI context window
}

export class AiChatNotifier {
  constructor(private readonly config: AiChatNotifierConfig = { enabled: true }) {}

  async send(payload: NotifyPayload): Promise<void> {
    if (!this.config.enabled) {
      console.log("[AiChatNotifier] Disabled, skipping notification");
      return;
    }

    // TODO: Implement actual AI chat notification when integrating
    // This would typically inject the notification into an AI context or chat stream
    console.log(`[AiChatNotifier] Sending notification:`);
    console.log(`  Title: ${payload.title}`);
    console.log(`  Body: ${payload.body}`);
    console.log(`  Urgency: ${payload.urgency}`);
    console.log(`  Channel: ${payload.channel}`);
    console.log(`  IncludeInContext: ${this.config.includeInAiContext ?? true}`);
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
