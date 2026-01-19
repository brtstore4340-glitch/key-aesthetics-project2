try {
  module.exports = require("./lib/index.js");
} catch (err) {
  const functions = require("firebase-functions");

  exports.api = functions.region("asia-southeast1").https.onRequest((_req, res) => {
    res.status(500).send("Functions bundle missing. Run: npm --prefix functions run build");
  });
}
