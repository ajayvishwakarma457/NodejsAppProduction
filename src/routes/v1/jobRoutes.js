const express = require('express');
const JobController = require('../../controllers/v1/jobController');
const { authenticate } = require('../../middlewares/v1/authMiddleware');

const router = express.Router();

// Protect job trigger endpoint with authentication middleware
router.use(authenticate);

router.post('/trigger-email', JobController.triggerEmail);
router.get('/failed', JobController.getFailedJobs);

module.exports = router;
