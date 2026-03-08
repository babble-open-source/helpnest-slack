# helpnest-slack

Search your HelpNest help center directly from Slack.

## Commands

| Command | Description |
|---|---|
| `/helpnest [query]` | Search your help center articles by keyword. Results appear only to you (ephemeral). Click **Share** to post an article to the channel. |
| `/helpnest-ask [question]` | Ask a natural-language question. HelpNest returns the most relevant articles as your answer. |

---

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**.
2. Choose **From an app manifest**.
3. Select your workspace and click **Next**.
4. Paste the contents of [`manifest.yml`](./manifest.yml) into the YAML editor and click **Next** → **Create**.

### 2. Install to your workspace

1. In your app settings, go to **OAuth & Permissions** → **Install to Workspace**.
2. After installation, copy the **Bot User OAuth Token** (starts with `xoxb-`).
3. Go to **Basic Information** → **App Credentials** and copy the **Signing Secret**.

### 3. Set environment variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token from OAuth & Permissions |
| `SLACK_SIGNING_SECRET` | Signing Secret from Basic Information |
| `HELPNEST_URL` | Base URL of your HelpNest instance (e.g. `https://help.yourcompany.com`) |
| `HELPNEST_API_KEY` | API key generated in your HelpNest workspace settings |
| `HELPNEST_WORKSPACE` | Your HelpNest workspace slug (e.g. `acme`) |
| `PORT` | Port to listen on (default: `3000`) |

### 4. Deploy

Build and start the server:

```bash
npm install
npm run build
npm start
```

### 5. Add the Request URL in Slack

1. In your Slack app settings, go to **Slash Commands**.
2. Edit `/helpnest` and `/helpnest-ask`.
3. Set the **Request URL** to `https://your-domain.com/slack/events` for both commands.
4. Save changes.

---

## Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

Set the following environment variables in your Railway project:

- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `HELPNEST_URL`
- `HELPNEST_API_KEY`
- `HELPNEST_WORKSPACE`

Railway will automatically detect the `npm run build && npm start` workflow. After deploy, use your Railway public URL as the Slack Request URL (`https://<project>.up.railway.app/slack/events`).

---

## Local development

Use [ngrok](https://ngrok.com) to expose your local server to the internet for testing:

```bash
# Terminal 1 — start the bot in dev mode (auto-restarts on save)
npm run dev

# Terminal 2 — expose port 3000
ngrok http 3000
```

Copy the ngrok HTTPS URL (e.g. `https://abc123.ngrok.io`) and set it as the Slack Request URL: `https://abc123.ngrok.io/slack/events`.

> The ngrok URL changes each restart unless you have a paid ngrok account. Update the Slack app settings each time.

---

## Permissions (OAuth scopes)

| Scope | Reason |
|---|---|
| `commands` | Register and receive slash commands |
| `chat:write` | Post messages in channels the bot is a member of |
| `chat:write.public` | Post messages in public channels without joining |

---

## Self-hosted HelpNest

If you are running HelpNest on your own infrastructure, set `HELPNEST_URL` to your instance's base URL (e.g. `https://help.internal.yourcompany.com`). The bot communicates with HelpNest via its REST API and requires a valid API key.

See the [HelpNest documentation](https://helpnest.dev/docs) for instructions on generating API keys from your workspace settings.
