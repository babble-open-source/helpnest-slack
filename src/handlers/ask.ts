import type { SlashCommand, Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';
import type { HelpNestClient } from '../helpnest.js';
import type { HelpNestArticle } from '../types.js';

const MAX_CONTEXT_ARTICLES = 3;

export function buildAskHandler(
  client: HelpNestClient,
): Middleware<SlackCommandMiddlewareArgs> {
  return async ({ command, ack, respond }) => {
    // Acknowledge immediately — Slack requires a response within 3 seconds.
    // We send a holding message so the user knows work is in progress.
    await ack();

    const question = (command as SlashCommand).text.trim();

    if (!question) {
      await respond({
        response_type: 'ephemeral',
        text: 'Please provide a question. Usage: `/helpnest-ask <your question>`',
      });
      return;
    }

    // Send immediate feedback while we fetch results
    await respond({
      response_type: 'ephemeral',
      text: 'Searching for an answer...',
    });

    let articles: HelpNestArticle[];
    try {
      articles = await client.search(question);
    } catch (err) {
      console.error('[ask] HelpNest API error:', err);
      await respond({
        response_type: 'ephemeral',
        text: 'Something went wrong while searching. Please try again later.',
      });
      return;
    }

    const contextArticles = articles.slice(0, MAX_CONTEXT_ARTICLES);

    if (contextArticles.length === 0) {
      await respond({
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Answer based on your help center*',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: "I couldn't find relevant articles. Please contact support.",
            },
          },
        ],
        text: "I couldn't find relevant articles.",
      });
      return;
    }

    const numberedList = contextArticles
      .map((article, i) => `${i + 1}. <${article.url}|${escapeSlackMarkdown(article.title)}>`)
      .join('\n');

    const sourceLinks = contextArticles
      .map((article) => `<${article.url}|${escapeSlackMarkdown(article.title)}>`)
      .join(' · ');

    await respond({
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Answer based on your help center*',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Here are the most relevant articles I found:\n\n${numberedList}`,
          },
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Sources: ${sourceLinks}`,
            },
          ],
        },
      ],
      text: `Found ${contextArticles.length} relevant article(s) for your question.`,
    });
  };
}

function escapeSlackMarkdown(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
