import * as express from "express";
import { rtdb, firestore } from "./db";
import { v4 as uuidv4 } from "uuid";
import * as cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(
	express.urlencoded({
		extended: true,
	}),
);

const port = 3500;

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});

const userCollection = firestore.collection("users");
const roomCollection = firestore.collection("rooms");

// POST /signup: con este endpoint vamos a dar de alta en Firestore a un user pidiéndole solo el email.
app.post("/signup", async (req, res) => {
	const { email, name } = req.body;

	const searchResponse = await userCollection.where("email", "==", email).get();

	if (searchResponse.empty) {
		const newUserRef = await userCollection.add({
			email,
			name,
		});

		await res.json({
			id: newUserRef.id,
			new: true,
		});
	} else {
		await res.status(400).json({
			message: "user already exist",
		});
	}
});

// POST /auth: con este endpoint vamos a chequear el email que nos envíen en el body y a devolver el id interno (el id de Firestore) de ese user. En el futuro vamos a pedir adicionalmente una contraseña.
app.post("/auth", async (req, res) => {
	const { email } = req.body;

	const searchResponse = await userCollection.where("email", "==", email).get();

	if (searchResponse.empty) {
		await res.status(404).json({
			message: "not found",
		});
	} else {
		await res.json({
			id: searchResponse.docs[0].id,
		});
	}
});

// POST /rooms: este endpoint va a crear un room en Firestore y en la Realtime Database. En la primera va a guardar el id corto (AAFF, por ejemplo) y lo va a asociar a un id complejo que estará en la Realtime DB.
app.post("/rooms", async (req, res) => {
	const { userId } = req.body;
	const doc = await userCollection.doc(userId.toString()).get();
	if (doc.exists) {
		const roomRef = await rtdb.ref("rooms/" + uuidv4());

		await roomRef.set({
			messages: [],
			owner: userId,
		});
		const roomLongId = await roomRef.key;
		const roomId = (await 1000) + Math.floor(Math.random() * 999);
		await roomCollection.doc(roomId.toString()).set({
			rtdbRoomId: roomLongId,
		});
		await res.json({
			id: roomId.toString(),
		});
	} else {
		await res.status(401).json({
			message: "user not exist",
		});
	}
});

// POST /rooms/:roomId este endpoint va a acceder a una room existente siempre que esta room exista y le pasemos un usuario valido
app.get("/rooms/:roomId", async (req, res) => {
	const { userId } = req.query;
	const { roomId } = req.params;

	const doc = await userCollection.doc(userId.toString()).get();

	if (doc.exists) {
		const snap = await roomCollection.doc(roomId).get();
		const data = await snap.data();
		await res.json(data);
	} else {
		await res.status(401).json({
			message: "user not exist",
		});
	}
});

// Agrega los mensajes a la rtdb
app.post("/message", async (req, res) => {
	const { message, author, rtdbId } = req.body;

	const roomRef = await rtdb.ref("rooms/" + rtdbId + "/messages");

	await roomRef.push({
		author,
		message,
	});

	await res.json({
		message: "message ready",
	});
});
