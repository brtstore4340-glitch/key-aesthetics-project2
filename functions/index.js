/**
 * Entrypoint for Firebase Functions.
 *
 * This file re-exports the compiled output from functions/src so the Firebase
 * runtime loads the bundled code produced by `npm --prefix functions run build`.
 */

module.exports = require("./lib");
