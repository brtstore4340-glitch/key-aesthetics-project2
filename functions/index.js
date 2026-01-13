const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const AUTH_EMAIL_DOMAIN = process.env.AUTH_EMAIL_DOMAIN || "staff.local";

function requireAuth(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }
}

async function requireAdmin(uid) {
  const snapshot = await db.collection("users").doc(uid).get();
  const role = snapshot.exists ? snapshot.data().role : null;
  if (role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }
}

async function requireRole(uid, allowedRoles) {
  const snapshot = await db.collection("users").doc(uid).get();
  const role = snapshot.exists ? snapshot.data().role : null;
  if (!allowedRoles.includes(role)) {
    throw new functions.https.HttpsError("permission-denied", "Access denied");
  }
  return role;
}

function makeAuthEmail(username) {
  return `${String(username).toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

function generateOrderNo() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const random = Math.floor(Math.random() * 900 + 100);
  return `ORD-${stamp}-${random}`;
}

exports.createUser = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  await requireAdmin(context.auth.uid);

  const { username, pin, name, role } = data || {};
  if (!username || !pin || !name || !role) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  const userRecord = await admin.auth().createUser({
    email: makeAuthEmail(username),
    password: String(pin),
    displayName: String(name),
  });

  await db.collection("users").doc(userRecord.uid).set({
    username: String(username),
    name: String(name),
    role: String(role),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { uid: userRecord.uid };
});

exports.deleteUser = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  await requireAdmin(context.auth.uid);

  const { uid } = data || {};
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "Missing uid");
  }

  await admin.auth().deleteUser(uid);
  await db.collection("users").doc(uid).delete();

  return { uid };
});

exports.createOrder = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  await requireRole(context.auth.uid, ["admin", "staff"]);

  const { items, total, status, customerInfo, attachments } = data || {};
  if (!Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Order items required");
  }

  const orderData = {
    orderNo: generateOrderNo(),
    status: status || "draft",
    items,
    total: Number(total || 0),
    customerInfo: customerInfo || {},
    attachments: Array.isArray(attachments) ? attachments : [],
    createdBy: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("orders").add(orderData);
  return { id: docRef.id };
});

exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const role = await requireRole(context.auth.uid, ["admin", "accounting", "staff"]);

  const { id, status } = data || {};
  if (!id || !status) {
    throw new functions.https.HttpsError("invalid-argument", "Missing order id or status");
  }

  if (role === "staff" && status !== "submitted") {
    throw new functions.https.HttpsError("permission-denied", "Staff can only submit orders");
  }

  const updates = {
    status: String(status),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (status === "verified") {
    updates.verifiedBy = context.auth.uid;
    updates.verifiedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await db.collection("orders").doc(id).update(updates);

  return { id };
});
