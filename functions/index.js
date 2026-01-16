const functions = require("firebase-functions");

// Fix: Chain .region() before the trigger definition
exports.api = functions.region("asia-southeast1").https.onRequest((req, res) => {
  res.send("Boots-POS Gemini (v1) is running!");
});
