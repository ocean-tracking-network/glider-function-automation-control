import { sse_channel } from "./base.mjs"

const broadcast_new_logs = (log) => {
  sse_channel.broadcast(log, 'logs.new')
  console.log('[logs.new]: sent')
}

export {broadcast_new_logs}