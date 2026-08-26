import { createChannel, createSession } from 'better-sse'

const sse_channel = createChannel()

const sse_broadcast = async (req, res) => {
  const session = await createSession(req, res)
  sse_channel.register(session)
}

export {sse_channel, sse_broadcast}