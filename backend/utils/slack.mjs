import axios from 'axios'
import { WebClient } from '@slack/web-api'
import '../loadEnvironment.mjs'

async function send_slack_message(text) {
  if (process.env.SEND_SLACK_MESSAGES.toLowerCase() == 'false') {
    return
  }
  const data = {
    text: text,
  }
  const url = process.env.SLACK_URL
  axios
    .post(url, data)
    .then(console.log('Slack Message sent ' + text))
    .catch((err) => console.log(err))
}

async function sendSlackNotification(recipient, message) {
  if (
    process.env.SEND_SLACK_NOTIFICATION_MESSAGES?.toLowerCase() != 'true' ||
    !process.env.SLACK_TOKEN
  ) {
    return { status: 'skipped', reason: 'slack-not-configured' }
  }

  const slack_id = String(recipient?.slack_id || '').trim()
  if (!slack_id) {
    return { status: 'skipped', reason: 'missing-slack-id' }
  }

  try {
    const slackClient = new WebClient(process.env.SLACK_TOKEN)
    // This should be a slack user id e.g "U0B54JR3G8K"
    const result = await slackClient.chat.postMessage({
      channel: slack_id,
      text: message,
    })

    return {
      status: 'sent',
      slackChannelId: result.channel || slack_id,
      slackMessageTs: result.ts,
    }
  } catch (error) {
    return {
      status: 'error',
      reason: error.data?.error || error.message || 'slack-api-error',
    }
  }
}

export { send_slack_message, sendSlackNotification }
