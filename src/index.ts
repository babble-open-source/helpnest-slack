import { createSlackApp } from './slack.js';
import { HelpNestClient } from './helpnest.js';
import { buildSearchHandler } from './handlers/search.js';
import { buildAskHandler } from './handlers/ask.js';
import { buildActionsHandler } from './handlers/actions.js';

// ---------------------------------------------------------------------------
// Environment validation — fail fast with actionable error messages
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[startup] Missing required environment variable: ${name}`);
    console.error(`[startup] Copy .env.example to .env and fill in all values.`);
    process.exit(1);
  }
  return value;
}

const SLACK_BOT_TOKEN = requireEnv('SLACK_BOT_TOKEN');
const SLACK_SIGNING_SECRET = requireEnv('SLACK_SIGNING_SECRET');
const HELPNEST_URL = requireEnv('HELPNEST_URL');
const HELPNEST_API_KEY = requireEnv('HELPNEST_API_KEY');
const HELPNEST_WORKSPACE = requireEnv('HELPNEST_WORKSPACE');

// Silence unused-variable warnings — these are set into process.env and consumed
// by createSlackApp() which reads them directly.
void SLACK_BOT_TOKEN;
void SLACK_SIGNING_SECRET;

const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------

const helpnestClient = new HelpNestClient({
  baseUrl: HELPNEST_URL,
  apiKey: HELPNEST_API_KEY,
  workspaceSlug: HELPNEST_WORKSPACE,
});

const app = createSlackApp();

// ---------------------------------------------------------------------------
// Slash command handlers
// ---------------------------------------------------------------------------

app.command('/helpnest', buildSearchHandler(helpnestClient, HELPNEST_URL));
app.command('/helpnest-ask', buildAskHandler(helpnestClient));

// ---------------------------------------------------------------------------
// Block action handlers
// ---------------------------------------------------------------------------

app.action('helpnest_share_article', buildActionsHandler());

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

(async () => {
  // Bolt's built-in ExpressReceiver listens on the given port.
  // Slack sends slash command payloads to POST /slack/events.
  await app.start(PORT);
  console.log(`[startup] HelpNest Slack bot running on port ${PORT}`);
  console.log(`[startup] Slack events endpoint: http://localhost:${PORT}/slack/events`);
  console.log(`[startup] HelpNest workspace: ${HELPNEST_WORKSPACE} @ ${HELPNEST_URL}`);
})();
