const ANNOUNCEMENTS = [
  {
    id: 'daily-checkin-reminder',
    title: 'Daily check-in reminder',
    body: 'Please complete the parent daily check-in before the end of the day so the teacher can review home progress.',
    audience: 'parent',
    priority: 'normal',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'home-practice',
    title: 'Home practice tip',
    body: 'Try one short child activity today. Even 5 minutes of practice helps keep progress consistent.',
    audience: 'parent',
    priority: 'normal',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'communication',
    title: 'Stay connected',
    body: 'Use parent-teacher chat for questions about reports, emotions, or behavior changes.',
    audience: 'parent',
    priority: 'info',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

function listAnnouncementsForRole(role) {
  return ANNOUNCEMENTS.filter((item) => item.audience === 'all' || item.audience === role || role === 'super_admin');
}

module.exports = { listAnnouncementsForRole };
