const jwt = require('jsonwebtoken');

const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRE || '30d'
};

// Generate JWT Token
const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn
  });
};

// Verify JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Generate refresh token (longer expiry)
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: '7d'
  });
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  jwtConfig
};