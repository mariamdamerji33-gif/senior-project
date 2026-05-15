const express = require('express');
const homeController = require('../controllers/homeController');

const router = express.Router();

router.get('/', homeController.root);
router.get('/console', homeController.apiConsole);
router.get('/api/health', homeController.health);

module.exports = router;
