import jwt from 'jsonwebtoken'
const { sign, verify } = jwt

function authenticateToken(req, res, next) {
  if (process.env.USE_AUTH == 'false') {
    return next()
  }
  const auth_header = req.headers['authorization']
  const token = auth_header && auth_header.split(' ')[1]

  if (!token) {
    return res.sendStatus(401)
  }

  verify(token, process.env.SECRET_TOKEN, (err, user) => {
    console.log(err)
    if (err) {
      return res.sendStatus(403)
    }
    req.user = user
    next()
  })
}

function generateAuthToken(username, password) {
  if (username != process.env.USERNAME || password != process.env.PASSWORD) {
    return null
  }
  return sign({ name: username }, process.env.SECRET_TOKEN, { expiresIn: '1800s' })
}

export { generateAuthToken, authenticateToken }
