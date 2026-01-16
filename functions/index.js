const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

const express = require('express');
const { createServer } = require('http');

// Import your existing routes
const { registerRoutes } = require('../shared/server/routes');

// Build the Express app using existing route registration
const app = express();
const httpServer = createServer(app);
const ready = registerRoutes(httpServer, app);

exports.api = functions
  .region('asia-southeast1')
  .https.onRequest(async (req, res) => {
    await ready;
    return app(req, res);
  });
