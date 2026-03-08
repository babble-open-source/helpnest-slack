import type { SlashCommand, Middleware, SlashCommandMiddlewareArgs } from '@slack/bolt';
import type { HelpNestClient } from '../helpnest.js';
import type { HelpNestArticle } from '../types.js';

export function buildArticleBlocks(
  articles: HelpNestArticle[],
  query: string,
  baseUrl: string,
) {
  const blocks: object[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Results for: *${escapeSlackMarkdown(query)}*`,
      },
    },
    { type: 'divider' },
  ];

  for (const article of articles) {
    const titleLink = `<${article.url}|${escapeSlackMarkdown(article.title)}>`;
    const excerptText = article.excerpt
      ? `_${escapeSlackMarkdown(truncate(article.excerpt, 140))}_`
      : '';
    const collectionText = article.collectionName
      ? ` · ${escapeSlackMarkdown(article.collectionName)}`
      : '';

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${titleLink}*${collectionText}${excerptText ? `\n${excerptText}` : ''}`,
      },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Share', emoji: false },
        action_id: 'helpnest_share_article',
        value: JSON.stringify({
          id: article.id,
          title: article.title,
          url: article.url,
          excerpt: article.excerpt,
          collectionName: article.collectionName ?? null,
        }),
      },
    });

    blocks.push({ type: 'divider' });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Powered by HelpNest • \`${baseUrl}\``,
      },
    ],
  });

  return blocks;
}

export function buildSearchHandler(
  client: HelpNestClient,
  baseUrl: string,
): Middleware<SlashCommandMiddlewareArgs> {
  return async ({ command, ack, respond }) => {
    await ack();

    const query = (command as SlashCommand).text.trim();

    if (!query) {
      await respond({
        response_type: 'ephemeral',
        text: 'Please provide a search term. Usage: `/helpnest <search query>`',
      });
      return;
    }

    let articles: HelpNestArticle[];
    try {
      articles = await client.search(query);
    } catch (err) {
      console.error('[search] HelpNest API error:', err);
      await respond({
        response_type: 'ephemeral',
        text: 'Something went wrong while searching. Please try again later.',
      });
      return;
    }

    if (articles.length === 0) {
      await respond({
        response_type: 'ephemeral',
        text: `No articles found for *${escapeSlackMarkdown(query)}*. Try different keywords.`,
      });
      return;
    }

    const topArticles = articles.slice(0, 5);
    const blocks = buildArticleBlocks(topArticles, query, baseUrl);

    await respond({
      response_type: 'ephemeral',
      blocks,
      // Fallback text for notifications and accessibility
      text: `Found ${topArticles.length} article(s) for "${query}"`,
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
