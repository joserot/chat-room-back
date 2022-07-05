import * as admin from "firebase-admin";
import * as key from "./key.json";

admin.initializeApp({
	credential: admin.credential.cert(key as any),
	databaseURL: "https://chat-apx-default-rtdb.firebaseio.com",
});

const firestore = admin.firestore();
const rtdb = admin.database();

export { rtdb, firestore };
