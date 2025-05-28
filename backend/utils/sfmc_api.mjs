/**
 * Copyright 2020 Teledyne Webb Research as an unpublished work.
 *
 * The information contained herein is the property of Teledyne Webb Research
 * and is considered proprietary. This information may not be used for any
 * other purpose, copied, transferred or disclosed to third parties, reverse
 * engineered, modified or improved without written consent from Teledyne
 * Webb Research.
 *
 */

import sfmc from 'sfmc'
import { send_slack_message } from './slack.mjs'

async function get_active_deployment_details(gliderName) {
  let result = {}
  try {
    let token = await sfmc.accessToken.getAccessToken()
    result = await sfmc.glider.getActiveGliderDeploymentDetails(token.token, gliderName)
  } catch (sfmc_error) {
    console.log(sfmc_error)
    console.log('Could not get active deployment details for: ' + gliderName)
    return false
  }
  return result
}

async function upload_files(glider_name, glider_folder, file_paths) {
  if (process.env.SEND_FILES_TO_DUMMY_GLIDER) {
    glider_name = 'adam'
  }
  // let token = await sfmc.accessToken.getAccessToken()
  // const result = await sfmc.glider.uploadFiles(token.token, glider_name, glider_folder, file_paths)
  // send a slack notification whenever a file get's sent
  send_slack_message(`Sending file: ${file_paths} to ${glider_name}`)
}

export { get_active_deployment_details, upload_files }
