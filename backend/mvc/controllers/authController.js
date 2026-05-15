const { JWT_SECRET, AUTH_COOKIE_NAME, signAuthToken } = require('../../middleware/auth');
const { issueCsrfToken } = require('../../middleware/csrf');
const crypto = require('crypto');
const userModel = require('../models/userModel');
const registrationRequestModel = require('../models/registrationRequestModel');
const { verifyPassword, hashPassword } = require('../../utils/passwords');
const {
  isEmail,
  toEmailNorm,
  isNonEmptyString,
  isPasswordPolicyCompliant,
  passwordPolicyMessage,
  clampString,
} = require('../../utils/validate');
const { publicAccountJson, publicAccountFromJwtPayload } = require('../../utils/userProfile');
const { sendPasswordChangedEmail } = require('../../utils/passwordChangedEmail');
const { sendPasswordResetEmail } = require('../../utils/passwordResetEmail');
const { sendAccountCreatedEmail } = require('../../utils/accountCreatedEmail');
const { familyLoginBlockedOnWeb } = require('../../utils/clientChannel');

function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

async function login(req, res) {
  try {
    setNoStore(res);
    const { email, password } = req.body || {};
    const emailNorm = toEmailNorm(email);
    if (!isEmail(emailNorm) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (String(password).length > 128) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const data = await userModel.findByEmail(emailNorm);
    if (!data) return res.status(401).json({ error: 'Invalid credentials' });

    const check = await verifyPassword(data.password, password);
    if (!check.ok) return res.status(401).json({ error: 'Invalid credentials' });

    // Security: role comes from database (login form cannot override privileges).
    const user = { id: data.id, email: data.email, name: data.name, role: data.role || null };
    if (!user.role) {
      return res.status(400).json({ error: 'User role is not set. Set users.role in Supabase.' });
    }

    if (familyLoginBlockedOnWeb(user.role, req)) {
      return res.status(403).json({
        error: 'Family accounts must sign in using the mobile app.',
        code: 'FAMILY_USE_MOBILE_APP',
        hint: 'Download Autism School Mobile or ask your school coordinator for the app link.',
      });
    }

    // Backward compatibility: migrate old plain-text passwords to bcrypt on successful login.
    if (check.needsMigration) {
      try {
        await userModel.updateUser(user.id, { password });
      } catch {
        // Non-fatal: login should still work even if migration fails.
      }
    }

    if (!JWT_SECRET) {
      return res.status(503).json({
        error: 'Server misconfigured',
        ...(process.env.NODE_ENV !== 'production' ? { details: 'JWT_SECRET is missing in backend/.env' } : null),
      });
    }

    const token = signAuthToken(user);

    const useAuthCookie = String(process.env.AUTH_COOKIE_ENABLED || '').toLowerCase() === 'true';
    if (useAuthCookie) {
      const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
      const cookieParts = [
        `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'Path=/',
        `Max-Age=${60 * 60 * 24 * 7}`,
        'SameSite=Lax',
        'HttpOnly',
      ];
      if (isProd) cookieParts.push('Secure');
      res.setHeader('Set-Cookie', cookieParts.join('; '));
    }

    let outgoingUser = null;
    try {
      const row = await userModel.findProfileById(user.id);
      outgoingUser = row ? await publicAccountJson(row) : publicAccountFromJwtPayload({ ...user, sub: user.id });
    } catch {
      outgoingUser =
        publicAccountFromJwtPayload({ sub: user.id, email: user.email, name: user.name, role: user.role }) || null;
    }
    res.json({
      token,
      user: outgoingUser || { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({
      error: 'Server error',
      ...(process.env.NODE_ENV !== 'production' ? { details: err?.message || String(err) } : null),
    });
  }
}

function logout(req, res) {
  setNoStore(res);
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const parts = [`${AUTH_COOKIE_NAME}=`, 'Path=/', 'SameSite=Lax', 'HttpOnly', 'Max-Age=0'];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
  res.json({ ok: true });
}

function csrfToken(req, res) {
  setNoStore(res);
  const token = issueCsrfToken(req, res);
  res.json({ token });
}

async function me(req, res) {
  setNoStore(res);
  try {
    let outgoing = null;
    try {
      const row = await userModel.findProfileById(req.auth.sub);
      outgoing = row ? await publicAccountJson(row) : publicAccountFromJwtPayload(req.auth);
    } catch {
      outgoing = publicAccountFromJwtPayload(req.auth);
    }
    if (!outgoing) return res.status(404).json({ error: 'User not found' });
    if (familyLoginBlockedOnWeb(outgoing.role, req)) {
      return res.status(403).json({
        error: 'Family accounts must use the mobile app.',
        code: 'FAMILY_USE_MOBILE_APP',
        hint: 'Sign in with Autism School Mobile, not this website.',
      });
    }
    res.json({ user: outgoing });
  } catch (err) {
    res.status(500).json({
      error: 'Server error',
      ...(process.env.NODE_ENV !== 'production' ? { details: err?.message || String(err) } : null),
    });
  }
}

/**
 * Public registration:
 * - Coordinator / Teacher / Family → account created immediately (yes = sign in now).
 * - School Admin → pending request; an existing super_admin must approve (no = errors; pending = wait).
 */
async function registerRequest(req, res) {
  try {
    const { name, email, password, requestedRole } = req.body || {};
    const emailNorm = toEmailNorm(email);
    if (!isEmail(emailNorm) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (String(password).length > 128) {
      return res.status(400).json({ error: passwordPolicyMessage() });
    }
    if (!requestedRole || typeof requestedRole !== 'string') {
      return res.status(400).json({ error: 'requestedRole is required' });
    }
    const allowedRoles = ['super_admin', 'manager', 'therapist', 'parent'];
    if (!allowedRoles.includes(requestedRole)) {
      return res.status(400).json({ error: 'Invalid requested role' });
    }
    if (!isPasswordPolicyCompliant(String(password))) {
      return res.status(400).json({ error: passwordPolicyMessage() });
    }

    const existing = await userModel.findByEmailIdOnly(emailNorm);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const nm = clampString(name, 200);

    if (requestedRole === 'super_admin') {
      const password_hash = await hashPassword(password);
      await registrationRequestModel.insertPending({
        name: nm || null,
        email: emailNorm,
        password_hash,
        requested_role: requestedRole,
      });
      return res.status(201).json({
        ok: true,
        immediate: false,
        message:
          'Your School Admin request is pending. Another administrator must approve it before you can sign in.',
      });
    }

    const user = await userModel.createUser({
      name: nm || null,
      email: emailNorm,
      password,
      role: requestedRole,
      created_at: new Date().toISOString(),
    });

    void sendAccountCreatedEmail({
      to: emailNorm,
      name: user.name != null ? String(user.name) : null,
      role: user.role,
    })
      .then((mailRes) => {
        if (mailRes?.sent) {
          console.log('[auth] account-created email sent to', emailNorm);
        }
      })
      .catch((e) => {
        console.error('[auth] account-created email failed:', e?.message || e);
      });

    return res.status(201).json({
      ok: true,
      immediate: true,
      message: 'Your account was created. You can sign in now.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    const code = err?.code;
    const msg = err?.message || String(err);
    if (code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
      return res.status(409).json({
        error: /registration_requests|pending/i.test(msg)
          ? 'A pending School Admin request already exists for this email'
          : 'An account with this email already exists',
      });
    }
    if (code === '42501' || /row-level security|RLS/i.test(msg)) {
      return res.status(503).json({
        error: 'Database blocked this write (RLS). Configure SUPABASE_SERVICE_ROLE_KEY in backend/.env.',
      });
    }
    res.status(500).json({
      error: 'Server error',
      ...(process.env.NODE_ENV !== 'production' ? { details: msg } : null),
    });
  }
}

/**
 * Public: check School Admin registration / account state for an email (for return-visit notifications).
 * Does not reveal whether an arbitrary email is in the system beyond what the user already submitted.
 */
async function registrationStatus(req, res) {
  try {
    const { email } = req.body || {};
    const emailNorm = toEmailNorm(email);
    if (!isEmail(emailNorm)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const user = await userModel.findByEmailIdOnly(emailNorm);
    const reqRow = await registrationRequestModel.findLatestByEmail(emailNorm);

    if (!reqRow && user) {
      return res.json({
        status: 'active',
        message: 'An account exists for this email. You can sign in.',
      });
    }

    if (!reqRow && !user) {
      return res.json({
        status: 'none',
        message: 'No registration request found for this email.',
      });
    }

    if (reqRow.status === 'pending') {
      return res.json({
        status: 'pending',
        message: 'Your School Admin request is still waiting for approval.',
      });
    }

    if (reqRow.status === 'rejected') {
      return res.json({
        status: 'rejected',
        message: 'Your School Admin request was not approved.',
        reject_reason: reqRow.reject_reason || null,
      });
    }

    if (reqRow.status === 'approved') {
      if (!user) {
        return res.json({
          status: 'approved',
          message: 'Your request was approved. If sign-in fails, contact your administrator.',
        });
      }
      return res.json({
        status: 'approved',
        message: 'Your account is ready. You can sign in with your email and password.',
      });
    }

    return res.json({ status: 'unknown', message: 'Unable to determine status.' });
  } catch (err) {
    res.status(500).json({
      error: 'Server error',
      ...(process.env.NODE_ENV !== 'production' ? { details: err?.message || String(err) } : null),
    });
  }
}

/** When false (default), SMTP only sends “account created” + “password updated” — not forgot-password reset links. */
function smtpSendForgotPasswordResetEmail() {
  return String(process.env.SMTP_SEND_PASSWORD_RESET_EMAIL || '').trim().toLowerCase() === 'true';
}

function forgotPasswordSuccessMessage() {
  if (smtpSendForgotPasswordResetEmail()) {
    return 'If this email is registered, password reset instructions were sent when email delivery is enabled. Check your inbox or ask your school.';
  }
  return 'If this email is registered, a reset was started. Contact your school for help finishing the reset (reset link emails are turned off).';
}

function frontendOriginForResetLinks() {
  const explicit = process.env.FRONTEND_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') return '';
  return 'http://localhost:5173';
}

/** Public: request password reset (all account roles). Sends same response for unknown email. */
async function forgotPassword(req, res) {
  setNoStore(res);
  try {
    const { email } = req.body || {};
    const emailNorm = toEmailNorm(email);
    if (!isEmail(emailNorm)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    let rawTokenForDev = null;
    const user = await userModel.findByEmail(emailNorm);
    try {
      if (user && user.role) {
        const rawToken = crypto.randomBytes(24).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await userModel.assignPasswordReset(user.id, { tokenHash, expiresAt });
        rawTokenForDev = rawToken;
      }
    } catch (err) {
      const msg = err?.message || String(err);
      if (/password_reset|column|schema|does not exist/i.test(msg)) {
        return res.status(503).json({
          error: 'Password reset is not set up yet.',
          hint: 'Apply supabase/password_reset_columns.sql on your database (or run run_all.sql), then retry.',
        });
      }
      throw err;
    }

    if (smtpSendForgotPasswordResetEmail() && rawTokenForDev && user) {
      const origin = frontendOriginForResetLinks();
      const resetUrl =
        origin && rawTokenForDev
          ? `${origin}/reset-password?token=${encodeURIComponent(rawTokenForDev)}`
          : '';
      void sendPasswordResetEmail({
        to: emailNorm,
        name: user.name != null ? String(user.name) : null,
        resetUrl,
        token: rawTokenForDev,
      })
        .then((mailRes) => {
          if (mailRes?.skipped) {
            console.warn('[auth] password-reset email skipped:', mailRes.reason || mailRes);
          }
        })
        .catch((e) => {
          console.error('[auth] password-reset email failed:', e?.message || e);
        });
    } else if (rawTokenForDev && user && !smtpSendForgotPasswordResetEmail()) {
      console.log('[auth] forgot-password: reset token saved; reset-link email disabled (SMTP_SEND_PASSWORD_RESET_EMAIL is not true).');
    }

    const payload = {
      ok: true,
      message: forgotPasswordSuccessMessage(),
    };
    if (process.env.NODE_ENV !== 'production' && rawTokenForDev) {
      const origin = frontendOriginForResetLinks();
      payload.devNotice = smtpSendForgotPasswordResetEmail()
        ? 'Development only: if SMTP is not set in backend/.env, use the link or token below. With reset email enabled, check the inbox too.'
        : 'Development only: reset-link email is off (SMTP_SEND_PASSWORD_RESET_EMAIL). Use the link or token below to test reset.';
      if (origin) {
        payload.devResetLink = `${origin}/reset-password?token=${encodeURIComponent(rawTokenForDev)}`;
      }
      payload.devResetToken = rawTokenForDev;
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({
      error: 'Server error',
      ...(process.env.NODE_ENV !== 'production' ? { details: err?.message || String(err) } : null),
    });
  }
}

async function resetPassword(req, res) {
  setNoStore(res);
  try {
    const { token, password } = req.body || {};
    if (!isNonEmptyString(token) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: 'token and password are required' });
    }
    if (String(password).length > 128) {
      return res.status(400).json({ error: passwordPolicyMessage() });
    }
    if (!isPasswordPolicyCompliant(String(password))) {
      return res.status(400).json({ error: passwordPolicyMessage() });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
    const row = await userModel.findByPasswordResetTokenHash(tokenHash);
    if (!row) {
      return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new one from Sign in.' });
    }

    try {
      await userModel.updateUser(row.id, {
        password,
        password_reset_token_hash: null,
        password_reset_expires_at: null,
      });
    } catch (err) {
      const msg = err?.message || String(err);
      if (/password_reset|column|schema|does not exist/i.test(msg)) {
        return res.status(503).json({
          error: 'Password reset is not set up yet.',
          hint: 'Apply supabase/password_reset_columns.sql on your database (or run run_all.sql), then retry.',
        });
      }
      throw err;
    }

    const notifyTo = String(row.email || '').trim();
    void sendPasswordChangedEmail({
      to: notifyTo,
      name: row.name != null ? String(row.name) : null,
    })
      .then((mailRes) => {
        if (mailRes?.skipped) {
          console.warn('[auth] password-changed email skipped:', mailRes.reason || mailRes);
        }
      })
      .catch((mailErr) => {
        console.error('[auth] password-changed email failed:', mailErr?.message || mailErr);
      });

    res.json({ ok: true, message: 'Your password was updated. You can sign in now.' });
  } catch (err) {
    res.status(500).json({
      error: 'Server error',
      ...(process.env.NODE_ENV !== 'production' ? { details: err?.message || String(err) } : null),
    });
  }
}

module.exports = { login, logout, csrfToken, me, registerRequest, registrationStatus, forgotPassword, resetPassword };
