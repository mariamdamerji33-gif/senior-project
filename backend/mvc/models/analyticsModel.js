const { db } = require('../../config/database');

async function getTableCounts() {
  const [usersRes, childrenRes, reportsRes, sessionsRes, activitiesRes] = await Promise.all([
    db().from('users').select('id', { count: 'exact', head: true }),
    db().from('children').select('id', { count: 'exact', head: true }),
    db().from('reports').select('id', { count: 'exact', head: true }),
    db().from('sessions').select('id', { count: 'exact', head: true }),
    db().from('activities').select('id', { count: 'exact', head: true }),
  ]);

  const errors = [usersRes.error, childrenRes.error, reportsRes.error, sessionsRes.error, activitiesRes.error].filter(Boolean);
  if (errors.length) throw new Error(errors[0].message);

  return {
    users: usersRes.count ?? 0,
    children: childrenRes.count ?? 0,
    reports: reportsRes.count ?? 0,
    sessions: sessionsRes.count ?? 0,
    activities: activitiesRes.count ?? 0,
  };
}

module.exports = { getTableCounts };
