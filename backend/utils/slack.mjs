import axios from 'axios'
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
    .then()
    .catch((err) => console.log(err))
}

export { send_slack_message }
