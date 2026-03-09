import type { Middleware, SlackActionMiddlewareArgs, BlockAction, ButtonAction } from '@slack/bolt';

interface SharedArticlePayload {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  collectionName: string | null;
}

export function buildActionsHandler(): Middleware<SlackActionMiddlewareArgs<BlockAction<ButtonAction>>> {
  return async ({ ack, action, body, client, logger }) => {
    await ack();

    if (!action.value) {
      logger.error('[actions] No action value — cannot share article');
      return;
    }

    let payload: SharedArticlePayload;
    try {
      payload = JSON.parse(action.value) as SharedArticlePayload;
    } catch {
      logger.error('[actions] Failed to parse action value:', action.value);
      return;
    }

    const channelId = body.channel?.id;

    if (!channelId) {
      logger.error('[actions] No channel ID in action body — cannot post to channel');
      return;
    }

    const titleLink = `<${payload.url}|${escapeSlackMarkdown(payload.title)}>`;
    const excerptText = payload.excerpt
      ? `_${escapeSlackMarkdown(truncate(payload.excerpt, 200))}_`
      : '';
    const collectionText = payload.collectionName
      ? ` · ${escapeSlackMarkdown(payload.collectionName)}`
      : '';

    // Re-post as a visible channel message so the whole team can see it
    await client.chat.postMessage({
      channel: channelId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Shared from HelpNest*\n\n*${titleLink}*${collectionText}${excerptText ? `\n${excerptText}` : ''}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Shared by <@${body.user.id}>`,
            },
          ],
        },
      ],
      text: `HelpNest article: ${payload.title} — ${payload.url}`,
      unfurl_links: false,
      unfurl_media: false,
    });
  };
}

function escapeSlackMarkdown(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
