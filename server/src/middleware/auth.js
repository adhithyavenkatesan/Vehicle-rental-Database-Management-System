const jwt = require('jsonwebtoken');
const { get } = require('../db');

// Server instance boot salt: invalidates all legacy stale tokens from previous development sessions
const SERVER_BOOT_SALT = process.env.JWT_SECRET || ('rentdrive-boot-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
const JWT_SECRET = SERVER_BOOT_SALT;

// In-memory set of revoked tokens (e.g. after logout or password reset)
const revokedTokens = new Set();

function revokeToken(token) {
  if (token) {
    revokedTokens.add(token);
  }
}

/**
 * Generate a JWT token for a user
 */
function generateToken(user, rememberMe = true) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: rememberMe ? '30d' : '1d' }
  );
}

/**
 * Authentication Middleware: Validates Bearer token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (revokedTokens.has(token)) {
    return res.status(401).json({ success: false, message: 'Session has ended. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user from DB with role and profile associations
    const user = get(
      `SELECT u.id, u.email, u.full_name, u.phone, u.status, u.role_id, r.name as role,
              c.id as customer_id, c.driving_license_no,
              s.id as staff_id, s.employee_code, s.designation
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN customers c ON c.user_id = u.id
       LEFT JOIN staff s ON s.user_id = u.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account has been suspended or deactivated.' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

/**
 * Role-Based Access Control Middleware
 * @param {Array<string>} roles
 */
function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}]. Your role is '${req.user.role}'.`
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  revokeToken,
  authenticate,
  authorize
};
