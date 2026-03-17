import sfmc, { glider } from 'sfmc'
import { send_slack_message } from './slack.mjs'

async function get_active_deployment_details(glider_name) {
  let result = {}
  try {
    let token = await sfmc.accessToken.getAccessToken()
    result = await sfmc.glider.getActiveGliderDeploymentDetails(token.token, glider_name)
  } catch (sfmc_error) {
    console.log(sfmc_error)
    console.log('Could not get active deployment details for: ' + glider_name)
    return false
  }
  return result
}

async function get_glider_details(glider_name, token="") {
  let result = {}
  if (!token) {
    token = await sfmc.accessToken.getAccessToken()
    token = token.token
  }
  try {
    result = await sfmc.glider.getGliderDetails(token, glider_name)
  } catch (sfmc_error){
    console.log(sfmc_error)
    console.log('Could not get glider details for: ' + glider_name)
  }
  return result.data
}

async function subscribe_for_glider_dialog(glider_name, callback) {
  let token = await sfmc.accessToken.getAccessToken()
  token = token.token
  let glider_details = await get_glider_details(glider_name, token)
  let glider_id = glider_details.id
  console.log(glider_id)
  sfmc.stompConnect.connect(token).then((stomp_client) => {
    sfmc.glider.subscribeForGliderOutputEvents(stomp_client, glider_id, callback)
  }).catch((err) => {
    console.log("Can't subscribe to dialog because: ")
    console.log(err)
  })
}

async function subscribe_for_glider_connection(glider_name, callback) {
  let token = await sfmc.accessToken.getAccessToken()
  token = token.token
  let glider_details = await get_glider_details(glider_name, token)
  let glider_id = glider_details.id
  console.log(glider_id)
  sfmc.stompConnect.connect(token).then((stomp_client) => {
    sfmc.glider.subscribeForConnectionEvents(stomp_client, glider_id, callback)
  }).catch((err) => {
    console.log("Can't subscribe to connection because: ")
    console.log(err)
  })
}

async function upload_file(glider_name, glider_folder, file_path, category) {
  if (process.env.SEND_FILES_TO_DUMMY_GLIDER.toLowerCase() == 'true') {
    glider_name = 'adam'
  }
  let token = await sfmc.accessToken.getAccessToken()
  const result = await sfmc.glider.uploadFiles(token.token, glider_name, glider_folder, [file_path])
  // send a slack notification whenever a file get's sent
  send_slack_message(
    `Sending file: ${category}/${file_path.replace('/tmp/', '')} to ${glider_name}`
  )
}

async function get_available_scripts(glider_name) {
  if (process.env.SEND_FILES_TO_DUMMY_GLIDER.toLowerCase() == 'true') {
    glider_name = 'adam'
  }
  let result = {}
  try {
    let token = await sfmc.accessToken.getAccessToken()
    result = await sfmc.glider.getAvailableScripts(token.token, glider_name)
  } catch (sfmc_error) {
    console.log(sfmc_error)
    console.log('Could not get scripts for glider: ' + glider_name)
  }
  if (result.data) {
    result = result.data
    if (result.factoryScripts) {
      result.factory = result.factoryScripts
      delete result.factoryScripts
    }
    if (result.userScripts) {
      result.user = result.userScripts
      delete result.userScripts
    }
  }
  return result
}

async function set_script(glider_name, script_name, script_type) {
  if (process.env.SEND_FILES_TO_DUMMY_GLIDER.toLowerCase() == 'true') {
    glider_name = 'adam'
  }
  let result = {}
  try {
    let token = await sfmc.accessToken.getAccessToken()
    result = await sfmc.glider.setAssignedScript(token.token, glider_name, script_type, script_name)
  } catch (sfmc_error) {
    console.log(sfmc_error)
    console.log('Count not get scripts for glider: ' + glider_name)
  }
  return result
}

async function clear_script(glider_name) {
  if (process.env.SEND_FILES_TO_DUMMY_GLIDER.toLowerCase() == 'true') {
    glider_name = 'adam'
  }
  let result = {}
  try {
    let token = await sfmc.accessToken.getAccessToken()
    result = await sfmc.glider.clearAssignedScript(token.token, glider_name)
  } catch (sfmc_error) {
    console.log(sfmc_error)
    console.log('Count not clear script for glider: ' + glider_name)
  }
  return result
}

export {
  get_active_deployment_details,
  upload_file,
  get_available_scripts,
  set_script,
  clear_script,
  subscribe_for_glider_connection,
  subscribe_for_glider_dialog,
  get_glider_details
}
