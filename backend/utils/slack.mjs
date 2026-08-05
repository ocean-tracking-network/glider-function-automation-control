import axios from 'axios'
import '../loadEnvironment.mjs'

async function send_slack_message(text) {
  if (process.env.SEND_SLACK_MESSAGES.toLowerCase() == 'false') {
    return
  }
  const slack_text = process.env.SLACK_PREFIX ? `${process.env.SLACK_PREFIX} - ${text}` : text
  const data = {
    text: slack_text,
  }
  const url = process.env.SLACK_URL
  axios
    .post(url, data)
    .then(console.log('Slack Message sent ' + text))
    .catch((err) => console.log(err))
}

export { send_slack_message }
