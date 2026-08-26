import { sse_channel } from "./base.mjs"


const broadcast_new_tracks = (glider_id, track) => {
  sse_channel.broadcast(
    {
      glider_id: glider_id,
      track: track,
    },
    'gliders.tracks.new',
  )
  console.log('[tracks.new]: sent')
}

export {broadcast_new_tracks}