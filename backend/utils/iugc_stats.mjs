import db from '../db/conn.mjs'

async function add_boat_enter_stat(boat, glider){
    let collection = await db.collection('iugc-stats')
    let {_id: _idg, ...glider_snapshot} = glider
    let {_id: _idb, ...boat_snapshot} = boat
    collection.insertOne({
        date: new Date(),
        glider_snapshot: glider_snapshot,
        boat_snapshot: boat_snapshot
    })
}

export {
    add_boat_enter_stat
}