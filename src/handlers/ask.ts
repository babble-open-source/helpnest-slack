import type { SlashCommand, Middleware, SlackCommandMiddlewareArgs } from '@slack/bolt';
import type { KnownBlock } from '@slack/types';
import type { HelpNestClient } from '../helpnest.js';
import type { AiAnswer } from '../types.js';

export function buildAskHandler(
  client: HelpNestClient,
  helpnestUrl: string,
): Middleware<SlackCommandMiddlewareArgs> {
  return async ({ command, ack, respond }) => {
    // Acknowledge immediately — Slack requires a response within 3 seconds.
    await ack();

    const question = (command as SlashCommand).text.trim();
    const userId = (command as SlashCommand).user_id;
    const userName = (command as SlashCommand).user_name ?? 'Slack user';

    if (!question) {
      await respond({
        response_type: 'ephemeral',
        text: 'Please provide a question. Usage: `/helpnest-ask <your question>`',
      });
      return;
    }

    // Show immediate feedback while the AI thinks (typically 3–8 seconds).
    await respond({
      response_type: 'ephemeral',
      text: ':thought_balloon: Looking that up for you...',
    });

    let answer: AiAnswer;
    try {
      // Create a conversation session, then send the question to the AI agent.
      const conversation = await client.createConversation(`@${userName}`);

      if (!conversation.aiEnabled) {
        await respond({
          response_type: 'ephemeral',
          text: 'AI is not configured for this workspace yet. Ask your admin to enable it in *Dashboard → Settings → AI Agent*.',
        });
        return;
      }

      answer = await client.askAI(conversation.id, conversation.sessionToken, question);
    } catch (err) {
      console.error('[ask] HelpNest API error:', err);
      await respond({
        response_type: 'ephemeral',
        text: 'Something went wrong while getting an answer. Please try again later.',
      });
      return;
    }

    // AI escalated — no confident answer found.
    if (answer.escalated || !answer.answer) {
      await respond({
        response_type: 'ephemeral',
        blocks: buildEscalatedBlocks(question, helpnestUrl),
        text: "This question has been passed to your support team — check the HelpNest inbox.",
      });
      return;
    }

    await respond({
      response_type: 'ephemeral',
      blocks: buildAnswerBlocks(question, answer, helpnestUrl, userId),
      text: answer.answer,
    });
  };
}

function buildAnswerBlocks(
  question: string,
  answer: AiAnswer,
  helpnestUrl: string,
  userId: string,
): KnownBlock[] {
  const blocks: KnownBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Q: ${escapeSlackMarkdown(truncate(question, 100))}*`,
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: escapeSlackMarkdown(answer.answer),
      },
    },
  ];

  // Source articles
  if (answer.sources.length > 0) {
    const sourceLinks = answer.sources
      .slice(0, 3)
      .map((s) => {
        const articleUrl = `${helpnestUrl}/help/${s.slug}`;
        return `<${articleUrl}|${escapeSlackMarkdown(s.title)}>`;
      })
      .join('  ·  ');

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Sources: ${sourceLinks}`,
        },
      ],
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Answered by HelpNest AI · <@${userId}>`,
        },
      ],
    },
  );

  return blocks;
}

function buildEscalatedBlocks(question: string, helpnestUrl: string): KnownBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Q: ${escapeSlackMarkdown(truncate(question, 100))}*`,
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "I couldn't find a confident answer to this question. It's been flagged in the HelpNest inbox for your team to review.",
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `View inbox: <${helpnestUrl}/dashboard/inbox|HelpNest Inbox>`,
        },
      ],
    },
  ];
}

function escapeSlackMarkdown(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
