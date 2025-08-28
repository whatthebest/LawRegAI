/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Use your Realtime Database region
const region = "asia-southeast1"; // change if your RTDB is elsewhere

exports.syncSopCounterOnDelete = functions
  .region(region)
  .database.ref("/sops/{key}")
  .onDelete(async (snap) => {
    const deletedIndex = snap.child("sopIndex").val();
    const db = admin.database();
    const counterRef = db.ref("meta/sopCounter");
    const counter = (await counterRef.get()).val();

    // Only resync if we deleted the HIGHEST item
    if (typeof counter === "number" && deletedIndex === counter) {
      const s = await db.ref("sops").orderByChild("sopIndex").limitToLast(1).get();
      let highest = 0;
      s.forEach((ch) => {
        const idx = ch.child("sopIndex").val();
        if (typeof idx === "number" && idx > highest) highest = idx;
      });
      await counterRef.set(highest);
    }
  });
