import db from '../db/conn.mjs'

async function add_boat_enter_stat(boat, glider){
    let collection = await db.collection('iugc_stats_boat_events')
    let {_id: _idg, ...glider_snapshot} = glider
    let {_id: _idb, ...boat_snapshot} = boat
    collection.insertOne({
        date: new Date(),
        glider_snapshot: glider_snapshot,
        boat_snapshot: boat_snapshot
    })
}

async function add_glider_position_stat(glider, track){
    let collection = await db.collection('iugc_stats_glider_pos')
    collection.insertOne({
        glider: glider.name,
        pos: track
    })
}

export {
    add_boat_enter_stat,
    add_glider_position_stat
}