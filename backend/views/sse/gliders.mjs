import { createChannel, createSession } from 'better-sse'

const channel = createChannel()

const listen = async (req, res) => {
  const session = await createSession(req, res)
  channel.register(session)
}

const broadcast_new_tracks = (glider_id, track) => {
  channel.broadcast(
    {
      glider_id: glider_id,
      track: track,
    },
    'gliders.tracks.new',
  )
  console.log('[gliders.tracks.new]: sent')
}

const broadcast_new_logs = (log) => {
  channel.broadcast(log, 'gliders.logs.new')
  console.log('[gliders.logs.new]: sent')
}

const gliders_sse = { channel, listen, broadcast_new_tracks, broadcast_new_logs }

export { gliders_sse }
