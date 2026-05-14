import { create_contact as create_contact_util, delete_contact as delete_contact_util, get_contacts as get_contacts_util, update_contact as update_contact_util } from '../utils/notify_utils.mjs'

const get_contacts = async (req, res) => {
  const contacts = await get_contacts_util()
  res.status(200).send({ contacts })
}

const create_contact = async (req, res) => {
  const result = await create_contact_util(req.body)
  if (result.error) {
    return res.status(400).send({ error: result.error })
  }
  res.status(201).send(result)
}

const edit_contact = async (req, res) => {
  const result = await update_contact_util(req.params.id, req.body)
  if (result.error) {
    return res.status(result.error === 'Contact not found' ? 404 : 400).send({ error: result.error })
  }
  res.status(200).send(result)
}

const delete_contacts = async (req, res) => {
  await delete_contact_util(req.params.id)
  res.status(204).send()
}

export { get_contacts, create_contact, edit_contact, delete_contacts }

