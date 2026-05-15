const { listAnnouncementsForRole } = require('../../data/announcementsData');

function listAnnouncements(req, res) {
  const role = req.auth?.role;
  const items = listAnnouncementsForRole(role);
  res.json({ announcements: items });
}

module.exports = { listAnnouncements };
