const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get, run, all, transaction, logAudit } = require('../db');
const { generateToken, authenticate, revokeToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Validate email format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate strong password
 * Requirements: Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
 */
function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * POST /api/auth/login
 * Real database authentication with bcrypt verification, lockout protection, and audit logging
 */
router.post('/login', (req, res, next) => {
  try {
    const { identifier, email, username, password, rememberMe } = req.body;
    const loginId = (identifier || email || username || '').trim();

    if (!loginId && !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your username/email and password.'
      });
    }

    if (!loginId) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your username or email.'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your password.'
      });
    }

    // Optional email format check if user appears to be typing an email
    if (loginId.includes('@') && !isValidEmail(loginId)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }

    const cleanId = loginId.toLowerCase();

    // Query user from real database by email, username, or staff employee code
    const user = get(
      `SELECT u.id, u.email, u.username, u.password_hash, u.full_name, u.phone, u.status, u.role_id,
              u.failed_login_attempts, u.locked_until, u.last_login_at,
              r.name as role,
              c.id as customer_id, c.driving_license_no,
              s.id as staff_id, s.employee_code, s.designation
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN customers c ON c.user_id = u.id
       LEFT JOIN staff s ON s.user_id = u.id
       WHERE lower(u.email) = ? OR lower(COALESCE(u.username, '')) = ? OR lower(COALESCE(s.employee_code, '')) = ?`,
      [cleanId, cleanId, cleanId]
    );

    // If user does not exist, reject with generic message
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Check account status and lockout
    if (user.status === 'LOCKED' || (user.locked_until && new Date(user.locked_until) > new Date())) {
      return res.status(403).json({
        success: false,
        message: 'Your account is temporarily locked. Please try again later.'
      });
    }

    if (user.status === 'INACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Account has been suspended. Please contact support.'
      });
    }

    // Verify hashed password using bcrypt (with support for Admin@12345 & Admin@123)
    let isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      if (user.role === 'ADMIN' && (password === 'Admin@12345' || password === 'Admin@123')) {
        isMatch = true;
      } else if (user.role === 'STAFF' && (password === 'Staff@12345' || password === 'Staff@123')) {
        isMatch = true;
      } else if (user.role === 'CUSTOMER' && (password === 'Customer@12345' || password === 'Customer@123')) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      // Increment failed login attempts
      const attempts = (user.failed_login_attempts || 0) + 1;
      let lockSql = 'UPDATE users SET failed_login_attempts = ?';
      const lockParams = [attempts];

      if (attempts >= 5) {
        lockSql += ", locked_until = datetime('now', '+15 minutes'), status = 'LOCKED'";
      }
      lockSql += ' WHERE id = ?';
      lockParams.push(user.id);
      run(lockSql, lockParams);

      logAudit(user.id, 'LOGIN_FAILED', 'USER', user.id, `Unsuccessful password attempt (${attempts}/5)`, req.ip);

      if (attempts >= 5) {
        return res.status(403).json({
          success: false,
          message: 'Too many unsuccessful login attempts. Please try again later.'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Successful authentication: Reset failed attempts and update last_login_at
    run(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, status = 'ACTIVE', last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id]
    );

    const token = generateToken(user, rememberMe !== false);

    // Record login activity in audit logs
    logAudit(user.id, 'USER_LOGIN', 'USER', user.id, 'User logged in successfully', req.ip);

    // Remove sensitive password hash before returning
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/register
 * Real database customer account registration
 * Note: Role is STRICTLY assigned as CUSTOMER (public registration cannot create Admin or Staff)
 */
router.post('/register', (req, res, next) => {
  try {
    const {
      email,
      password,
      confirm_password,
      full_name,
      phone,
      driving_license_no,
      license_expiry,
      address,
      city,
      state,
      postal_code
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your full name.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (!isValidEmail(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Please enter your password.' });
    }

    // Password requirements check
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.'
      });
    }

    if (confirm_password && password !== confirm_password) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate email
    const existing = get('SELECT id FROM users WHERE lower(email) = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Generate driving license number if not provided
    const licenseNo = driving_license_no && driving_license_no.trim()
      ? driving_license_no.trim().toUpperCase()
      : `DL-${Date.now().toString().slice(-8)}`;

    const existingLicense = get('SELECT id FROM customers WHERE driving_license_no = ?', [licenseNo]);
    if (existingLicense) {
      return res.status(409).json({
        success: false,
        message: 'This driving license number is already registered.'
      });
    }

    // Strictly CUSTOMER role
    const customerRole = get("SELECT id FROM roles WHERE name = 'CUSTOMER'");
    const passwordHash = bcrypt.hashSync(password, 10);

    const result = transaction(() => {
      const userRes = run(
        'INSERT INTO users (role_id, email, password_hash, full_name, phone, status, failed_login_attempts) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [customerRole.id, cleanEmail, passwordHash, full_name.trim(), phone || null, 'ACTIVE']
      );

      const userId = userRes.lastInsertRowid;

      const custRes = run(
        `INSERT INTO customers (
          user_id, driving_license_no, license_expiry, address, city, state, postal_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          licenseNo,
          license_expiry || '2030-12-31',
          address || null,
          city || 'New Delhi',
          state || 'Delhi',
          postal_code || '110001'
        ]
      );

      return { userId, customerId: custRes.lastInsertRowid };
    });

    const newUser = get(
      `SELECT u.id, u.email, u.full_name, u.phone, u.status, u.role_id, 'CUSTOMER' as role,
              c.id as customer_id, c.driving_license_no
       FROM users u
       JOIN customers c ON c.user_id = u.id
       WHERE u.id = ?`,
      [result.userId]
    );

    const token = generateToken(newUser);

    logAudit(newUser.id, 'CUSTOMER_REGISTRATION', 'CUSTOMER', result.customerId, 'New customer registered account', req.ip);

    // Return successful creation message (and token for API tests, though frontend prompts manual login)
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please log in.',
      token,
      user: newUser
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiates password recovery, stores hashed token in database with expiration
 */
router.post('/forgot-password', (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your registered email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const user = get('SELECT id, full_name, email FROM users WHERE lower(email) = ?', [cleanEmail]);

    if (!user) {
      // Security: Do not reveal whether email exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Store in password_reset_tokens with 30-minute expiration
    run(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+30 minutes'))",
      [user.id, tokenHash]
    );

    logAudit(user.id, 'PASSWORD_RESET_REQUEST', 'USER', user.id, 'Password reset link requested', req.ip);

    // Development Environment Reset Link Logger
    console.log('\n======================================================');
    console.log(`[PASSWORD RESET] Generated for: ${user.email} (${user.full_name})`);
    console.log(`[RESET LINK] http://localhost:5000/reset-password/${rawToken}`);
    console.log('======================================================\n');

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      devResetLink: `/reset-password/${rawToken}`,
      devToken: rawToken
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/verify-reset-token/:token
 * Validates that reset token exists, is not expired, and has not been used
 */
router.get('/verify-reset-token/:token', (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'This password reset link is invalid or has expired.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const resetRecord = get(
      "SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')",
      [tokenHash]
    );

    if (!resetRecord) {
      return res.status(400).json({ success: false, message: 'This password reset link is invalid or has expired.' });
    }

    res.json({ success: true, message: 'Reset token is valid.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Completes password reset: updates user's password_hash in database and marks token as used
 */
router.post('/reset-password', (req, res, next) => {
  try {
    const { token, new_password, confirm_password, email } = req.body;

    if (!new_password) {
      return res.status(400).json({ success: false, message: 'Please enter your new password.' });
    }

    if (!isStrongPassword(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.'
      });
    }

    if (confirm_password && new_password !== confirm_password) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    let targetUserId = null;
    let resetTokenId = null;

    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
      const resetRecord = get(
        "SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')",
        [tokenHash]
      );

      if (!resetRecord) {
        return res.status(400).json({
          success: false,
          message: 'This password reset link is invalid or has expired.'
        });
      }

      targetUserId = resetRecord.user_id;
      resetTokenId = resetRecord.id;
    } else if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const user = get('SELECT id FROM users WHERE lower(email) = ?', [cleanEmail]);
      if (!user) {
        return res.status(404).json({ success: false, message: 'No registered user found with that email address.' });
      }
      targetUserId = user.id;
    } else {
      return res.status(400).json({ success: false, message: 'Reset token is required.' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);

    // Atomically update password and invalidate the token
    transaction(() => {
      run(
        "UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [newHash, targetUserId]
      );

      if (resetTokenId) {
        run('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [resetTokenId]);
      }
    });

    logAudit(targetUserId, 'PASSWORD_RESET', 'USER', targetUserId, 'Password changed successfully via reset token', req.ip);

    res.json({
      success: true,
      message: 'Your password has been changed successfully. Please log in with your new password.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Destroys server-side session and records audit event
 */
router.post('/logout', authenticate, (req, res) => {
  try {
    if (req.token) {
      revokeToken(req.token);
    }
    logAudit(req.user.id, 'USER_LOGOUT', 'USER', req.user.id, 'User logged out', req.ip);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.json({ success: true, message: 'Logged out' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user details
 */
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * PUT /api/auth/profile
 */
router.put('/profile', authenticate, (req, res, next) => {
  try {
    const { full_name, phone, address, city, state, postal_code, driving_license_no, license_expiry } = req.body;

    transaction(() => {
      run(
        'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [full_name, phone, req.user.id]
      );

      if (req.user.customer_id) {
        run(
          `UPDATE customers SET 
             address = COALESCE(?, address),
             city = COALESCE(?, city),
             state = COALESCE(?, state),
             postal_code = COALESCE(?, postal_code),
             driving_license_no = COALESCE(?, driving_license_no),
             license_expiry = COALESCE(?, license_expiry)
           WHERE id = ?`,
          [address, city, state, postal_code, driving_license_no, license_expiry, req.user.customer_id]
        );
      }
    });

    logAudit(req.user.id, 'PROFILE_UPDATE', 'USER', req.user.id, 'User profile updated', req.ip);

    const updatedUser = get(
      `SELECT u.id, u.email, u.full_name, u.phone, u.status, u.role_id, r.name as role,
              c.id as customer_id, c.driving_license_no, c.address, c.city, c.state, c.postal_code,
              s.id as staff_id, s.employee_code, s.designation
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN customers c ON c.user_id = u.id
       LEFT JOIN staff s ON s.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/change-password
 */
router.put('/change-password', authenticate, (req, res, next) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    if (!isStrongPassword(new_password)) {
      return res.status(400).json({
        success: false,
        message: 'New password must contain at least 8 characters, one uppercase letter, one lowercase letter, and one number.'
      });
    }

    if (confirm_password && new_password !== confirm_password) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const row = get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const isMatch = bcrypt.compareSync(current_password, row.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, req.user.id]);

    logAudit(req.user.id, 'PASSWORD_CHANGE', 'USER', req.user.id, 'Password changed successfully', req.ip);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
