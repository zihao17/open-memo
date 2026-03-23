/**
 * Smoke test / demo entry for @open-memo/integrations
 *
 * Demonstrates:
 * 1. Creating a NotifyPayload
 * 2. Routing it through NotifierRouter
 * 3. Outputting the routing result
 *
 * Run with: node packages/integrations/dist/demo/smoke.js
 */

import { NotifierRouter } from "../index";
import type { NotifyPayload } from "@open-memo/shared";

async function main() {
  console.log("=".repeat(60));
  console.log("Open Memo Integrations - Smoke Test");
  console.log("=".repeat(60));
  console.log();

  // 1. Create a mock NotifyPayload
  const mockPayload: NotifyPayload = {
    taskId: "task-001",
    title: "Review PR #42",
    body: "PR #42 is waiting for your review. Priority: P1",
    channel: "system", // Will be routed to SystemNotifier
    urgency: "high",
    deepLink: "https://github.com/org/repo/pull/42",
    dedupeKey: "pr-42-review-reminder",
  };

  console.log("1. Created NotifyPayload:");
  console.log(JSON.stringify(mockPayload, null, 2));
  console.log();

  // 2. Create NotifierRouter with default config
  const router = new NotifierRouter({
    system: { enabled: true },
    browser: { enabled: true },
    aiChat: { enabled: true },
  });

  console.log("2. NotifierRouter initialized:");
  console.log(JSON.stringify(router.getSummary(), null, 2));
  console.log();

  // 3. Route the notification
  console.log("3. Routing notification through NotifierRouter...");
  console.log();

  const result = await router.route(mockPayload);

  console.log();
  console.log("4. Routing result:");
  console.log(JSON.stringify(result, null, 2));
  console.log();

  // 4. Test routing to different channels
  console.log("-".repeat(60));
  console.log("Testing all three channels:");
  console.log("-".repeat(60));
  console.log();

  const channels: Array<NotifyPayload["channel"]> = ["system", "browser", "ai_chat"];

  for (const channel of channels) {
    const payload: NotifyPayload = {
      taskId: `task-channel-test`,
      title: `Test notification for ${channel}`,
      body: `This notification is routed to ${channel} channel`,
      channel,
      urgency: "normal",
      deepLink: null,
      dedupeKey: `test-${channel}-${Date.now()}`,
    };

    console.log(`\nRouting to "${channel}" channel:`);
    const r = await router.route(payload);
    console.log(`Result: ${JSON.stringify(r)}`);
  }

  console.log();
  console.log("=".repeat(60));
  console.log("Smoke test completed successfully!");
  console.log("=".repeat(60));
}

main().catch(console.error);
