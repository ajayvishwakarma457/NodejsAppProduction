'use strict';

const express = require('express');
const abTestingDemoController = require('../../controllers/v1/abTestingDemoController');
const router = express.Router();

router.get('/pricing', abTestingDemoController.getPricingPlan);

module.exports = router;
