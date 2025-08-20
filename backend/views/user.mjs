import { generateAuthToken } from '../utils/auth.mjs'

const login = async (req, res) => {
  const username = req.body.username
  const password = req.body.password
  const token = generateAuthToken(username, password)
  if (!token) {
    return res.sendStatus(401)
  }
  res.send({ token: token })
}

export { login }
