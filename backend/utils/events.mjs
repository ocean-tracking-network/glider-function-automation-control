import db from '../db/conn.mjs'

const trigger_event = async (event, geofence = null, glider = null) => {
  if (!glider) {
    const glider_collection = db.collection('gliders')
    glider = glider_collection.findOne({ _id: ObjectId.createFromHexString(event.glider) })
  }
  const files_collection = await db.collection('files')
  const file = await files_collection.findOne({ _id: ObjectId.createFromHexString(event.file) })
  if (file != null) {
    const tmp_dir = os.tmpdir()
    const temp_file_location = tmp_dir + '/' + file.filename
    try {
      fs.copyFileSync(file.path, temp_file_location)
    } catch (err) {
      console.log('ERROR CERATING THE TEMP FILE!')
      return
    }

    try {
      console.log('trying to upload file')
      await upload_files(glider.name, 'to-glider', [temp_file_location])
      if (geofence) {
        await create_log(
          `${glider.name} has ${event_type}ed the geofence ${geofence.name}. Sent file: ${file.filename}`,
          'info',
          glider._id
        )
      } else {
        await create_log(`Sent file: ${file.filename} to ${glider.name}`, 'info', glider._id)
      }
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
    fs.rmSync(temp_file_location)
  } else {
    console.log('File object not found!')
  }
}

export { trigger_event }
