// This imports Express so we can build the server.
import express from "express";
// This imports cors so the frontend can call the backend from another URL.
import cors from "cors";

// This imports the database client.
import db from "./db/client.js";
// These import the skill tree database functions.
import { createTreesTable, createTree, getTreesByUserId } from "./db/trees.js";
// These import the user database functions.
import {
  createUser,
  createUsersTable,
  getUserByEmail,
  getUserById,
} from "./db/users.js";

// This sets the port for the server.
const PORT = process.env.PORT || 3001;
// These are the frontend URLs that are allowed to talk to this API.
const allowedOrigins = [
  "http://localhost:3000",
  "https://caps-fe.netlify.app",
];

// This creates the Express app.
const app = express();

// This connects to the database.
await db.connect();
// This makes sure the users table exists.
await createUsersTable();
// This makes sure the skill_trees table exists.
await createTreesTable();

// This lets the server read JSON from requests.
app.use(express.json());
// This allows the frontend to make requests to this backend.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
  })
);

// This is a simple health route to check if the server is running.
app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

// This route registers a new user.
app.post("/api/auth/register", async (request, response) => {
  // This takes the values from the request body.
  const { name, email, password } = request.body;

  // This checks that all required values were sent.
  if (!name || !email || !password) {
    response.status(400).json({ error: "Name, email, and password are required." });
    return;
  }

  // This looks for an existing user with the same email.
  const existingUser = await getUserByEmail(email);

  // This stops duplicate accounts from being created.
  if (existingUser) {
    response.status(409).json({ error: "A user with that email already exists." });
    return;
  }

  // This creates the new user in the database.
  const user = await createUser(name, email, password);
  // This sends the new user back to the client.
  response.status(201).json({ user });
});

// This route logs in an existing user.
app.post("/api/auth/login", async (request, response) => {
  // This takes the values from the request body.
  const { email, password } = request.body;

  // This checks that both values were sent.
  if (!email || !password) {
    response.status(400).json({ error: "Email and password are required." });
    return;
  }

  // This looks up the user by email.
  const user = await getUserByEmail(email);

  // This checks that the user exists and the password matches.
  if (!user || user.password_hash !== password) {
    response.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  // This sends the user back if login works.
  response.json({ user });
});

// This route gets one user by id.
app.get("/api/users/:id", async (request, response) => {
  // This looks up the user using the id from the URL.
  const user = await getUserById(request.params.id);

  // This returns a 404 if the user was not found.
  if (!user) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  // This sends the user back to the client.
  response.json({ user });
});

// This route gets all trees for one user.
app.get("/api/trees", async (request, response) => {
  // This turns the userId query value into a number.
  const userId = Number(request.query.userId);

  // This checks that userId was sent.
  if (!userId) {
    response.status(400).json({ error: "userId is required." });
    return;
  }

  // This gets all trees that belong to that user.
  const trees = await getTreesByUserId(userId);
  // This sends the tree list back to the client.
  response.json({ trees });
});

// This route creates a new tree.
app.post("/api/trees", async (request, response) => {
  // This takes the values from the request body.
  const { userId, title, description, isPublic } = request.body;

  // This checks that the required values were sent.
  if (!userId || !title) {
    response.status(400).json({ error: "userId and title are required." });
    return;
  }

  // This creates the new tree in the database.
  const tree = await createTree(userId, title, description || "", Boolean(isPublic));
  // This sends the new tree back to the client.
  response.status(201).json({ tree });
});

// This starts the server.
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
