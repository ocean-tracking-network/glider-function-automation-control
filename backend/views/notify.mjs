import { create_notification as create_notification_util, delete_notification as delete_notification_util, get_notifications as get_notifications_util, update_notification as update_notification_util } from '../utils/notify_utils.mjs'

const get_notifications = async (req, res) => {
  const notifications = await get_notifications_util()
  res.status(200).send({ notifications })
}

const create_notification = async (req, res) => {
  const result = await create_notification_util(req.body)
  if (result.error) {
    return res.status(400).send({ error: result.error })
  }
  res.status(201).send(result)
}

const edit_notification = async (req, res) => {
  const result = await update_notification_util(req.params.id, req.body)
  if (result.error) {
    return res.status(result.error === 'Notification not found' ? 404 : 400).send({ error: result.error })
  }
  res.status(200).send(result)
}

const delete_notifications = async (req, res) => {
  await delete_notification_util(req.params.id)
  res.status(204).send()
}

export { get_notifications, create_notification, edit_notification, delete_notifications }

