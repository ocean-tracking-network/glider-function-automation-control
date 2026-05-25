import db from '../db/conn.mjs'
import { comparePassword, generateAuthToken, hashPassword } from '../utils/auth.mjs'

//GETTING USER AND PASS FROM TEXTBOXES (ENTERED IN PAGE)
const login = async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.sendStatus(400)
  }

  //GATHER USER DB ENTRIES
  const collection = await db.collection('users')

  //COMPARE USER TEXTBOX TO DB ENTRIES IN USER COLUMN
  const user = await collection.findOne({ username })

  //IF NONE FOUND, ERR 401
  if (!user) {
    return res.sendStatus(401)
  }

  //COMPARE PASSWORD TO SUCCESSFULLY FOUND USER'S HASH
  const ok = await comparePassword(password, user.passwordHash)

  //IF DOESN'T MATCH, ERR 401
  if (!ok) {
    return res.sendStatus(401)
  }

  //IF WE'VE MADE IT THIS FAR, GENERATE A TOKEN WITH INFORMATION ABOUT THE ID, NAME, AND ROLE
  const token = generateAuthToken({
    id: user._id.toHexString(),
    username: user.username,
    role: user.role,
  })

  await collection.updateOne({ username }, { $set: { lastLogin: new Date() } })

  res.status(200).send({ token, role: user.role, username: user.username })
}

//CREATE USER FUNCTION, USERNAME, PASSWORD, AND ROLE REQUIRED TO CREATE
const create_user = async (req, res) => {
  const { username, password, role } = req.body
  //IF
  if (!username || !password) {
    return res.sendStatus(400)
  }

  //IF ROLE EQUALS ADMIN, SET AS ADMIN, IF ANY OTHER ENTRY, VIEWER USER SET
  const normalizedRole = role === 'admin' ? 'admin' : 'viewer'

  //GET USERS FROM DB
  const collection = await db.collection('users')

  //IF EXISTING USER FOUND, ERR 409, OTHERWISE CONTINUE
  const existing = await collection.findOne({ username })
  if (existing) {
    return res.sendStatus(409)
  }

  //ASSIGN passwordHash RESULT OF THE hashPassword FUNCTION FROM THE AUTH FILE
  const passwordHash = await hashPassword(password)

  //INSERT USER, PASSWORD HASH, ROLE, AND DATE CREATED INTO DB USING MONGODB FUNCTION
  const result = await collection.insertOne({
    username,
    passwordHash,
    role: normalizedRole,
    createdAt: new Date(),
  })

  //SHOW AS STATUS ID (MONGODB GENERATED)
  res.status(201).send({ _id: result.insertedId, username, role: normalizedRole })
}

const get_deletable_users = async (req, res) => {
  const collection = await db.collection('users')
  const users = await collection
    .find(
      { username: { $ne: req.user?.name } },
      { projection: { _id: 0, username: 1, role: 1, lastLogin: 1 } },
    )
    .sort({ username: 1 })
    .toArray()

  res.status(200).send({ users })
}

const user_exists = async (req, res) => {
  const { username } = req.params

  if (!username) {
    return res.sendStatus(400)
  }

  const collection = await db.collection('users')
  const existing = await collection.findOne({ username }, { projection: { _id: 1 } })
  res.status(200).send({ exists: !!existing })
}

const delete_user = async (req, res) => {
  const { username } = req.params

  if (!username) {
    return res.sendStatus(400)
  }

  if (req.user?.name === username) {
    return res.status(400).send({ error: 'You cannot delete your own account' })
  }

  const collection = await db.collection('users')
  const existing = await collection.findOne({ username })

  if (!existing) {
    return res.sendStatus(404)
  }

  await collection.deleteOne({ username })
  res.sendStatus(204)
}

const get_all_users = async (req, res) => {
  const collection = await db.collection('users')
  const users = await collection
    .find({}, { projection: { _id: 0, username: 1 } })
    .sort({ username: 1 })
    .toArray()

  res.status(200).send({ users })
}

export { login, create_user, get_deletable_users, user_exists, delete_user, get_all_users }
