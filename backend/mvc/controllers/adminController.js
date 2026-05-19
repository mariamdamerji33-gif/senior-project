const analyticsModel = require('../models/analyticsModel');
const userModel = require('../models/userModel');
const registrationRequestModel = require('../models/registrationRequestModel');
const {
  isEmail,
  toEmailNorm,
  isUuid,
  isPasswordPolicyCompliant,
  passwordPolicyMessage,
  clampString,
} = require('../../utils/validate');
const { writeAuditLog, baseActor } = require('../../utils/auditLog');
const { sendPasswordChangedEmail } = require('../../utils/passwordChangedEmail');
const { sendAccountCreatedEmail } = require('../../utils/accountCreatedEmail');
const { emailDeliveryNote, signInHintForRole } = require('../../utils/emailDeliveryNote');

const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

function safe500(res, err) {
  const msg = err?.message || String(err);
  res.status(500).json({
    error: 'Server error',
    ...(isProd ? null : { details: msg, code: err?.code }),
  });
}

async function analytics(req, res) {
  try {
    const counts = await analyticsModel.getTableCounts();
    res.json({ counts });
  } catch (err) {
    safe500(res, err);
  }
}

async function listAdminUsers(req, res) {
  try {
    const users = await userModel.listAllOrdered();
    res.json({ users });
  } catch (err) {
    safe500(res, err);
  }
}

async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password, and role are required' });
    }
    const allowed = ['super_admin', 'manager', 'therapist', 'parent'];
    if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const emailNorm = toEmailNorm(email);
    if (!isEmail(emailNorm)) return res.status(400).json({ error: 'Invalid email' });
    if (!isPasswordPolicyCompliant(String(password))) {
      return res.status(400).json({ error: passwordPolicyMessage() });
    }
    const existing = await userModel.findByEmailIdOnly(emailNorm);
    if (existing) return res.status(409).json({ error: 'Email already exists' });

    const payload = {
      name: name || null,
      email: emailNorm,
      password,
      role,
      created_at: new Date().toISOString(),
    };

    const data = await userModel.createUser(payload);
    let emailNotice = null;
    try {
      const mailRes = await sendAccountCreatedEmail({
        to: emailNorm,
        name: data?.name != null ? String(data.name) : null,
        role: data?.role,
      });
      emailNotice = emailDeliveryNote(mailRes, {
        sentLabel: 'Account created. A welcome email was sent to the user.',
      });
    } catch (e) {
      console.error('[admin] account-created email failed:', e?.message || e);
      emailNotice = 'Account created. Welcome email could not be sent — check server logs and SMTP settings.';
    }
    await writeAuditLog({
      ...baseActor(req),
      action: 'admin.user.create',
      targetId: data?.id || null,
      targetType: 'user',
      details: { email: emailNorm, role },
    });
    res.json({
      user: data,
      message: 'Account created.',
      emailNotice,
    });
  } catch (err) {
    const code = err?.code;
    const msg = err?.message || String(err);
    if (code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    if (code === '42501' || /row-level security|RLS/i.test(msg)) {
      return res.status(503).json({
        error: 'Database blocked this write (RLS). Configure SUPABASE_SERVICE_ROLE_KEY in backend/.env and restart the API.',
      });
    }
    safe500(res, err);
  }
}

async function updateUser(req, res) {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid user id is required' });

    const { name, email, role, password } = req.body || {};
    if (
      name === undefined &&
      email === undefined &&
      role === undefined &&
      password === undefined
    ) {
      return res.status(400).json({ error: 'Provide at least one of: name, email, role, password' });
    }

    const existing = await userModel.findById(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const allowed = ['super_admin', 'manager', 'therapist', 'parent'];
    if (role !== undefined && !allowed.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const nextRole = role !== undefined ? role : existing.role;
    if (existing.role === 'super_admin' && nextRole !== 'super_admin') {
      const n = await userModel.countWithRole('super_admin');
      if (n <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last super_admin account' });
      }
    }

    if (email !== undefined) {
      const emailNorm = toEmailNorm(email);
      if (!isEmail(emailNorm)) return res.status(400).json({ error: 'Invalid email' });
      const clash = await userModel.findByEmailIdOnly(emailNorm);
      if (clash && String(clash.id) !== String(id)) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const payload = {};
    if (name !== undefined) payload.name = name || null;
    if (email !== undefined) payload.email = toEmailNorm(email);
    if (role !== undefined) payload.role = role;
    if (password !== undefined) {
      if (!isPasswordPolicyCompliant(String(password))) {
        return res.status(400).json({ error: passwordPolicyMessage() });
      }
      payload.password = password;
    }

    const data = await userModel.updateUser(id, payload);
    if (!data) return res.status(500).json({ error: isProd ? 'Server error' : 'Update did not return a row' });
    let emailNotice = null;
    if (password !== undefined) {
      const notifyTo = String(data.email || '').trim();
      try {
        const mailRes = await sendPasswordChangedEmail({
          to: notifyTo,
          name: data.name != null ? String(data.name) : null,
        });
        emailNotice = emailDeliveryNote(mailRes, {
          sentLabel: 'Password updated. A confirmation email was sent to the user.',
        });
      } catch (mailErr) {
        console.error('[admin] password-changed email failed:', mailErr?.message || mailErr);
        emailNotice =
          'Password updated. Confirmation email could not be sent — check server logs and SMTP settings.';
      }
    }
    await writeAuditLog({
      ...baseActor(req),
      action: 'admin.user.update',
      targetId: id,
      targetType: 'user',
      details: {
        changed: Object.keys(payload),
        nextRole: role !== undefined ? role : undefined,
        nextEmail: email !== undefined ? toEmailNorm(email) : undefined,
      },
    });
    res.json({
      user: data,
      ...(password !== undefined ? { message: 'Password updated.', emailNotice } : {}),
    });
  } catch (err) {
    const code = err?.code;
    const msg = err?.message || String(err);
    if (code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
      return res.status(409).json({ error: 'Email already in use' });
    }
    if (code === '42501' || /row-level security|RLS/i.test(msg)) {
      return res.status(503).json({
        error: 'Database blocked this write (RLS). Configure SUPABASE_SERVICE_ROLE_KEY in backend/.env and restart the API.',
      });
    }
    safe500(res, err);
  }
}

async function deleteUser(req, res) {
  try {
    const id = String(req.params.id ?? '').trim();
    const actorId = String(req.auth?.sub ?? '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid user id is required' });
    if (id === actorId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const existing = await userModel.findById(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (existing.role === 'super_admin') {
      const n = await userModel.countWithRole('super_admin');
      if (n <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last super_admin account' });
      }
    }

    await userModel.deleteUser(id);
    await writeAuditLog({
      ...baseActor(req),
      action: 'admin.user.delete',
      targetId: id,
      targetType: 'user',
      details: { deletedRole: existing.role, deletedEmail: existing.email },
    });
    res.json({ ok: true });
  } catch (err) {
    const code = err?.code;
    const msg = err?.message || String(err);
    if (code === '23503' || /foreign key|violates foreign key/i.test(msg)) {
      return res.status(409).json({
        error: 'Cannot delete this user: other records still reference them (e.g. children, sessions).',
      });
    }
    if (code === '42501' || /row-level security|RLS/i.test(msg)) {
      return res.status(503).json({
        error: 'Database blocked this write (RLS). Configure SUPABASE_SERVICE_ROLE_KEY in backend/.env and restart the API.',
      });
    }
    safe500(res, err);
  }
}

function registrationRequestsSetupHint() {
  return 'Add SUPABASE_SERVICE_ROLE_KEY to backend/.env and restart the API. In Supabase → SQL editor, run supabase/registration_requests.sql if the table does not exist.';
}

function sendRegistrationRequestsError(res, err) {
  if (err?.code === 'MISSING_SERVICE_ROLE' || err?.statusCode === 503) {
    res.status(503).json({
      error: err.message || 'Database not configured for registration requests.',
      hint: registrationRequestsSetupHint(),
    });
    return true;
  }
  const msg = err?.message || String(err);
  if (/relation.*registration_requests|registration_requests.*does not exist|42P01|PGRST205/i.test(msg)) {
    res.status(503).json({
      error: 'Registration requests table is missing in the database.',
      hint: 'In Supabase → SQL editor, run supabase/registration_requests.sql (or supabase/run_all.sql), then restart the backend.',
    });
    return true;
  }
  return false;
}

async function listRegistrationRequests(req, res) {
  try {
    const raw = String(req.query.status || 'pending').trim().toLowerCase();
    const allowedStatuses = ['pending', 'approved', 'rejected', 'all'];
    const status = allowedStatuses.includes(raw) ? raw : 'pending';
    const requests = await registrationRequestModel.list({ status });
    const [pending, approved, rejected, all] = await Promise.all([
      registrationRequestModel.countByStatus('pending'),
      registrationRequestModel.countByStatus('approved'),
      registrationRequestModel.countByStatus('rejected'),
      registrationRequestModel.countByStatus('all'),
    ]);
    res.json({ requests, meta: { counts: { pending, approved, rejected, all } } });
  } catch (err) {
    if (sendRegistrationRequestsError(res, err)) return;
    safe500(res, err);
  }
}

async function approveRegistrationRequest(req, res) {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid request id is required' });

    const { role: roleOverride } = req.body || {};
    const row = await registrationRequestModel.findById(id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    if (row.status === 'approved') {
      return res.status(400).json({ error: 'This request was already approved' });
    }
    if (row.status !== 'pending' && row.status !== 'rejected') {
      return res.status(400).json({ error: 'This request is no longer pending' });
    }

    const allowed = ['super_admin', 'manager', 'therapist', 'parent'];
    const finalRole =
      roleOverride !== undefined && roleOverride !== null && String(roleOverride).trim() !== ''
        ? String(roleOverride).trim()
        : row.requested_role;
    if (!allowed.includes(finalRole)) return res.status(400).json({ error: 'Invalid role' });

    const emailNorm = toEmailNorm(row.email);
    const existing = await userModel.findByEmail(emailNorm);
    const actorId = String(req.auth?.sub ?? '').trim();

    async function sendWelcomeEmailForApproval(userRow) {
      try {
        const mailRes = await sendAccountCreatedEmail({
          to: emailNorm,
          name: userRow?.name != null ? String(userRow.name) : null,
          role: userRow?.role || finalRole,
          registrationRequestApproved: true,
        });
        return emailDeliveryNote(mailRes, {
          sentLabel: 'A confirmation email was sent to the user (request approved).',
        });
      } catch (e) {
        console.error('[admin] account-created email failed:', e?.message || e);
        return 'Welcome email could not be sent — check server logs and SMTP settings.';
      }
    }

    if (existing) {
      let user = existing;
      if (finalRole !== existing.role) {
        user = await userModel.updateUser(existing.id, { role: finalRole });
      }
      const emailNotice = await sendWelcomeEmailForApproval(user);
      await registrationRequestModel.resolve(id, {
        status: 'approved',
        resolved_at: new Date().toISOString(),
        resolved_by: isUuid(actorId) ? actorId : null,
        reject_reason: null,
      });
      await writeAuditLog({
        ...baseActor(req),
        action: 'admin.registration_request.approve',
        targetId: id,
        targetType: 'registration_request',
        details: {
          email: emailNorm,
          requestedRole: row.requested_role,
          finalRole,
          existingUserId: user?.id || existing.id,
          linkedExistingAccount: true,
        },
      });
      const signInHint = signInHintForRole(finalRole);
      return res.json({
        user,
        message:
          finalRole !== existing.role
            ? `Account already existed; role updated to ${finalRole}. ${signInHint}`
            : `Request approved. ${signInHint}`,
        emailNotice,
      });
    }

    const user = await userModel.createUserWithStoredPasswordHash({
      name: row.name,
      email: emailNorm,
      role: finalRole,
      passwordHash: row.password_hash,
      created_at: new Date().toISOString(),
    });

    const emailNotice = await sendWelcomeEmailForApproval(user);

    await registrationRequestModel.resolve(id, {
      status: 'approved',
      resolved_at: new Date().toISOString(),
      resolved_by: isUuid(actorId) ? actorId : null,
      reject_reason: null,
    });
    await writeAuditLog({
      ...baseActor(req),
      action: 'admin.registration_request.approve',
      targetId: id,
      targetType: 'registration_request',
      details: {
        email: emailNorm,
        requestedRole: row.requested_role,
        finalRole,
        createdUserId: user?.id || null,
      },
    });

    res.json({
      user,
      message: `Account created. ${signInHintForRole(finalRole)}`,
      emailNotice,
    });
  } catch (err) {
    const code = err?.code;
    const msg = err?.message || String(err);
    if (code === '23505' || /duplicate key|unique constraint/i.test(msg)) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    if (code === '42501' || /row-level security|RLS/i.test(msg)) {
      return res.status(503).json({
        error: 'Database blocked this write (RLS). Configure SUPABASE_SERVICE_ROLE_KEY in backend/.env and restart the API.',
      });
    }
    safe500(res, err);
  }
}

async function reopenRegistrationRequest(req, res) {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid request id is required' });

    const row = await registrationRequestModel.findById(id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    if (row.status === 'approved') {
      return res.status(400).json({
        error: 'This request is already approved. Click Refresh — the person can sign in (or use Admin Management → Users).',
      });
    }
    if (row.status === 'pending') {
      return res.status(400).json({
        error: 'This request is already pending. Use Approve or Reject below.',
      });
    }
    if (row.status !== 'rejected') {
      return res.status(400).json({ error: 'Only rejected requests can be returned to pending' });
    }

    const emailNorm = toEmailNorm(row.email);
    const existing = await userModel.findByEmailIdOnly(emailNorm);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const updated = await registrationRequestModel.reopenAsPending(id);
    await writeAuditLog({
      ...baseActor(req),
      action: 'admin.registration_request.reopen',
      targetId: id,
      targetType: 'registration_request',
      details: { email: emailNorm, requestedRole: row.requested_role },
    });

    res.json({ request: registrationRequestModel.rowPublic(updated) });
  } catch (err) {
    if (sendRegistrationRequestsError(res, err)) return;
    safe500(res, err);
  }
}

async function rejectRegistrationRequest(req, res) {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!isUuid(id)) return res.status(400).json({ error: 'Valid request id is required' });

    const { reason } = req.body || {};
    const row = await registrationRequestModel.findById(id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    if (row.status !== 'pending') {
      return res.status(400).json({ error: 'This request is no longer pending' });
    }

    const actorId = String(req.auth?.sub ?? '').trim();
    await registrationRequestModel.resolve(id, {
      status: 'rejected',
      reject_reason: reason != null ? clampString(reason, 500) || null : null,
      resolved_at: new Date().toISOString(),
      resolved_by: isUuid(actorId) ? actorId : null,
    });
    await writeAuditLog({
      ...baseActor(req),
      action: 'admin.registration_request.reject',
      targetId: id,
      targetType: 'registration_request',
      details: {
        email: row.email,
        requestedRole: row.requested_role,
        reason: reason != null ? clampString(reason, 500) || null : null,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    const code = err?.code;
    const msg = err?.message || String(err);
    if (code === '42501' || /row-level security|RLS/i.test(msg)) {
      return res.status(503).json({
        error: 'Database blocked this write (RLS). Configure SUPABASE_SERVICE_ROLE_KEY in backend/.env and restart the API.',
      });
    }
    safe500(res, err);
  }
}

module.exports = {
  analytics,
  listAdminUsers,
  createUser,
  updateUser,
  deleteUser,
  listRegistrationRequests,
  approveRegistrationRequest,
  reopenRegistrationRequest,
  rejectRegistrationRequest,
};
