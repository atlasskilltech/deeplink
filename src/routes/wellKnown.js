'use strict';

const express = require('express');
const wellKnown = require('../controllers/wellKnownController');

const router = express.Router();

// Android App Links verification.
router.get('/assetlinks.json', wellKnown.assetLinks);

// iOS Universal Links verification. IMPORTANT: no ".json" extension, and it
// must be served as application/json with HTTP 200 and no redirect.
router.get('/apple-app-site-association', wellKnown.appleAppSiteAssociation);

module.exports = router;
