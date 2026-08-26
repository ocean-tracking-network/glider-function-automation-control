import { sse_channel } from "./base.mjs"

const broadcast_new_boats = (boats) => {
    sse_channel.broadcast(boats, 'boats.new')
    console.log('[boats.new]: sent')
}

const broadcast_update_boats = (boats) => {
    sse_channel.broadcast(boats, 'boats.update')
    console.log('[boats.new]: sent')
}

const broadcast_delete_boats = (boats) => {
    sse_channel.broadcast(boats, 'boats.delete')
    console.log('[boats.new]: sent')
}

export {broadcast_new_boats, broadcast_update_boats, broadcast_delete_boats}