const supportRequestModel = require('../models/supportRequestModel');
const { writeAuditLog, baseActor } = require('../../utils/auditLog');

function isMissingSupportTable(err) {
  const msg = String(err?.message || err?.details || err || '');
  return err?.code === '42P01' || /support_requests/i.test(msg);
}

function supportTableError(res) {
  return res.status(503).json({
    error: 'Support requests table is not set up yet.',
    hint: 'In Supabase SQL Editor, run the support_requests table query, then try again.',
  });
}

async function createSupportRequest(req, res) {
  const { subject, message, childId } = req.body || {};
  const cleanSubject = String(subject || '').trim();
  const cleanMessage = String(message || '').trim();

  if (cleanSubject.length < 3 || cleanMessage.length < 5) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  try {
    const request = await supportRequestModel.createRequest({
      userId: req.auth?.sub || null,
      userEmail: req.auth?.email || null,
      userName: req.auth?.name || null,
      role: req.auth?.role || null,
      childId: childId ? String(childId).trim() : null,
      subject: cleanSubject,
      message: cleanMessage,
    });
    await writeAuditLog({
      ...baseActor(req),
      action: 'support.request.create',
      targetId: request?.id || null,
      targetType: 'support_request',
      details: { subject: cleanSubject.slice(0, 80), childId: childId ? String(childId).trim() : null },
    });
    res.json({ request });
  } catch (err) {
    if (isMissingSupportTable(err)) return supportTableError(res);
    res.status(500).json({ error: err.message || 'Failed to save support request' });
  }
}

async function listSupportRequests(req, res) {
  const status = String(req.query.status || 'all').trim();
  const allowed = ['all', 'sent', 'in_progress', 'resolved'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid support request status.' });

  try {
    const requests = await supportRequestModel.listRequests(status);
    res.json({ requests });
  } catch (err) {
    if (isMissingSupportTable(err)) return supportTableError(res);
    res.status(500).json({ error: err.message || 'Failed to load support requests' });
  }
}

async function updateSupportRequest(req, res) {
  const { id } = req.params;
  const action = String(req.body?.action || '').trim().toLowerCase();
  if (action === 'delete') {
    return deleteSupportRequest(req, res);
  }

  const nextStatus = String(req.body?.status || '').trim();
  const allowed = ['sent', 'in_progress', 'resolved'];

  if (!allowed.includes(nextStatus)) {
    return res.status(400).json({ error: 'Invalid support request status.' });
  }

  try {
    const request = await supportRequestModel.updateStatus(id, nextStatus);
    if (!request) return res.status(404).json({ error: 'Support request not found.' });
    await writeAuditLog({
      ...baseActor(req),
      action: 'support.request.status',
      targetId: String(id),
      targetType: 'support_request',
      details: {
        status: nextStatus,
        redacted: nextStatus === 'resolved',
      },
    });
    res.json({ request });
  } catch (err) {
    if (isMissingSupportTable(err)) return supportTableError(res);
    res.status(500).json({ error: err.message || 'Failed to update support request' });
  }
}

async function deleteSupportRequest(req, res) {
  const { id } = req.params;

  try {
    const deleted = await supportRequestModel.deleteRequest(id);
    if (!deleted) return res.status(404).json({ error: 'Support request not found.' });
    await writeAuditLog({
      ...baseActor(req),
      action: 'support.request.delete',
      targetId: String(id),
      targetType: 'support_request',
      details: {},
    });
    res.json({ ok: true });
  } catch (err) {
    if (isMissingSupportTable(err)) return supportTableError(res);
    res.status(500).json({ error: err.message || 'Failed to delete support request' });
  }
}

module.exports = {
  createSupportRequest,
  listSupportRequests,
  updateSupportRequest,
  deleteSupportRequest,
};
