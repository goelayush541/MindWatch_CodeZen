const serverless = require('serverless-http');
const app = require('./server');

// Wrap the Express app for Netlify
module.exports.handler = serverless(app);
