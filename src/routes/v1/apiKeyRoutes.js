const express = require('express');
const router = express.Router();
const ApiKeyController = require('../../controllers/v1/apiKeyController');
const { protect } = require('../../middlewares/v1/authMiddleware');

// Protect all routes under this router using JWT authentication
router.use(protect);

router.post('/', ApiKeyController.createApiKey);
router.get('/', ApiKeyController.getMyApiKeys);
router.delete('/:id', ApiKeyController.revokeApiKey);

module.exports = router;
