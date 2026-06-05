'use strict';

const express = require('express');
const featureFlagDemoController = require('../../controllers/v1/featureFlagDemoController');
const router = express.Router();

router.get('/demo', featureFlagDemoController.checkDemoFeatures);

module.exports = router;
