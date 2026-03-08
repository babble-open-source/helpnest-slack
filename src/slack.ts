import { App } from '@slack/bolt';

export function createSlackApp(): App {
  const token = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  // These are validated in index.ts before this function is called,
  // but we assert here so TypeScript knows they are defined.
  if (!token || !signingSecret) {
    throw new Error('SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET must be set');
  }

  const app = new App({
    token,
    signingSecret,
    // HTTP mode — the Express receiver handles routing at /slack/events
    socketMode: false,
  });

  return app;
}
