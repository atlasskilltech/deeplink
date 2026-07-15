'use strict';

const express = require('express');
const api = require('../controllers/apiController');

const router = express.Router();

// Menu API integration — enriched with deepLinkUrl / isDeepLinkable.
router.get('/menus', api.menus);

// Deep-link generator. Support both GET (query params) and POST (JSON body).
router.get('/deeplink', api.generateDeepLink);
router.post('/deeplink', api.generateDeepLink);

module.exports = router;
