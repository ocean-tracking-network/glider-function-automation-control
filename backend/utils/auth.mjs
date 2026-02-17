import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const { sign, verify } = jwt



function getTokenFromHeader(authHeader) {
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  return parts.length === 1 ? parts[0] : parts[1]
}

function authenticateToken(req, res, next) {
  if (process.env.USE_AUTH == 'false') {
    return next()
  }
  const authHeader = req.headers['authorization']
  const token = getTokenFromHeader(authHeader)

  if (!token) {
    return res.sendStatus(401)
  }

  verify(token, process.env.SECRET_TOKEN, (err, user) => {
    if (err) {
      return res.sendStatus(403)
    }
    req.user = user
    next()
  })
}

//REQUIRE ROLE ADMIN OR VIEWER
function requireRole(roles) {
  return (req, res, next) => {
    if (process.env.USE_AUTH == 'false') {
      return next()
    }
    if (!req.user) {
      return res.sendStatus(401)
    }
    if (!roles.includes(req.user.role)) {
      return res.sendStatus(403)
    }
    next()
  }
}

const requireAdmin = requireRole(['admin'])


//HASH PASSWORD WITH COST FACTOR OF 12, GOOD BALANCE OF PERFORMANCE AND SECURITY
//BCRYPT.HASH(X.0), TAKES PASSWORD AS ONE ARGUMENT, COST FACTOR AS THE OTHER.
async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

//USES BCRYPT COMPARE TO COMPARE PASSWORD WITH HASH TO VERIFY MATCH
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

function generateAuthToken(user) {
  return sign(
    { name: user.username, role: user.role, sub: user.id },
    process.env.SECRET_TOKEN,
    { expiresIn: '43200s' }
  )
}

export {
  generateAuthToken,
  authenticateToken,
  requireRole,
  requireAdmin,
  hashPassword,
  comparePassword,
}
