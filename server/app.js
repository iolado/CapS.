// This imports Express from the express package.
// Express is the backend framework that helps us create routes and send responses.
import express from "express";
import bcrypt from "bcrypt";

// This imports the cors package.
// This lets the frontend talk to the backend when they are running on different URLs or ports.
import cors from "cors";

// This imports the shared database client from db/client.js.
// All database helper files use this same client to talk to PostgreSQL.
import db from "./db/client.js";

// These import user helper functions from db/users.js.
// app.js calls these functions whenever it needs to create or read user data.
import {
  createUser,
  createUsersTable,
  getUserByEmail,
  getUserById,
} from "./db/users.js";

// These import tree helper functions from db/trees.js.
// app.js sends tree-related work to these functions instead of writing SQL directly here.
import {
  createTree,
  createTreesTable,
  deleteTree,
  getTreeById,
  getTreesByUserId,
  updateTree,
} from "./db/trees.js";

// These import skill helper functions from db/skills.js.
// app.js uses these when a route needs to create, read, update, or delete a skill.
import {
  createSkill,
  createSkillsTable,
  deleteSkill,
  getSkillById,
  getSkillsByTreeId,
  updateSkill,
} from "./db/skills.js";

// These import prerequisite helper functions from db/prerequisites.js.
// app.js uses them to connect one skill to another.
import {
  countPrerequisitesForSkill,
  createPrerequisite,
  createSkillPrerequisitesTable,
  deletePrerequisite,
  getPrerequisitesBySkillId,
} from "./db/prerequisites.js";

// These import progress helper functions from db/progress.js.
// app.js uses them to track whether a skill is locked, in progress, or completed.
import {
  createUserSkillProgressTable,
  getProgressByTreeId,
  prerequisitesAreCompleted,
  upsertProgress,
} from "./db/progress.js";

// This picks the server port.
// It uses the deployed port from the environment first, and falls back to 3001 for local development.
const PORT = process.env.PORT || 3001;

// This list stores the frontend URLs that are allowed to call this backend.
// The cors middleware below checks this list before allowing requests.
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://caps-fe.netlify.app",
];

// This list stores the only progress values the app is allowed to save.
// The progress route checks against this so bad values do not get stored.
const allowedStatuses = ["locked", "in_progress", "completed"];

// This creates the Express app instance.
// The rest of this file adds routes and middleware to this app.
const app = express();

// WHY (Functionality + Documentation): Auth code is easier to maintain when password rules
// are defined in one place, and this keeps password hashing consistent across register/login.
const BCRYPT_SALT_ROUNDS = 10;

// WHY (Functionality): Normalizing emails avoids duplicate accounts like Test@Email.com
// and test@email.com behaving like different users.
function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

// WHY (Functionality + Documentation): Returning user records without password_hash prevents
// exposing sensitive fields and makes API responses safer for normal use.
function toSafeUser(user) {
  if (!user) {
    return null;
  }

  // WHY (Code Style + Documentation): Explicitly listing safe fields is easier for beginners
  // to read, and it prevents accidental exposure of sensitive columns.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  };
}

// WHY (Functionality): We hash passwords before saving so stolen database rows do not contain
// readable passwords, which protects the core login/register user flow.
async function hashPassword(password) {
  // WHY (Functionality): bcrypt is a standard password-hashing library for login/register flows.
  // Using it makes stored passwords safer without changing the API contract.
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

// WHY (Functionality + Code Style): Centralizing password verification keeps login behavior
// consistent and easier for beginners to reason about in one helper.
async function verifyPassword(password, storedPasswordHash) {
  // WHY (Functionality): Some existing beginner data may still be plain text.
  // This fallback avoids breaking login while newer users are stored as hashes.
  if (!storedPasswordHash || !storedPasswordHash.startsWith("$2")) {
    return storedPasswordHash === password;
  }

  try {
    return await bcrypt.compare(password, storedPasswordHash);
  } catch {
    return false;
  }
}

// This opens the database connection before the server starts handling requests.
// The db object comes from db/client.js.
await db.connect();

// This makes sure the users table exists in the database.
// The function itself is defined in db/users.js.
await createUsersTable();

// This makes sure the skill_trees table exists in the database.
// The function itself is defined in db/trees.js.
await createTreesTable();

// This makes sure the skills table exists in the database.
// The function itself is defined in db/skills.js.
await createSkillsTable();

// This makes sure the prerequisite table exists in the database.
// The function itself is defined in db/prerequisites.js.
await createSkillPrerequisitesTable();

// This makes sure the progress table exists in the database.
// The function itself is defined in db/progress.js.
await createUserSkillProgressTable();

// This tells Express to automatically read JSON request bodies.
// Without this, request.body would not contain the form data the frontend sends.
app.use(express.json());

// This adds the cors middleware to the app.
// The frontend sends requests to this backend, and this code decides which frontend URLs are allowed.
app.use(
  cors({
    // This function runs every time a browser request checks whether it is allowed.
    origin(origin, callback) {
      // This allows requests with no origin, like some direct tools, and allows any URL in the allowlist.
      if (!origin || allowedOrigins.includes(origin)) {
        // This tells cors to allow the request.
        callback(null, true);
        return;
      }

      // This tells cors to block any origin that is not allowed.
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

// This helper function reads the user id from a request.
// Some routes send userId in the query string and some send it in the request body.
function getRequestedUserId(request) {
  // This returns the query userId first if it exists, otherwise it uses the body userId.
  // Number(...) turns the value into a real number.
  return Number(request.query.userId || request.body.userId);
}

// This helper function builds one full skill object for the frontend.
// It combines raw skill data, prerequisite data, and progress data into one easier object.
function buildSkillDetails(skill, prerequisiteRows, progressRows) {
  // This finds the progress row that belongs to this skill.
  const progress = progressRows.find((row) => row.skill_id === skill.id);

  // This finds all prerequisite rows that belong to this skill.
  const prerequisites = prerequisiteRows.filter(
    (row) => row.skill_id === skill.id,
  );

  // This counts how many prerequisite skills are already completed.
  const completedPrerequisites = prerequisites.filter((prerequisite) => {
    // This finds the saved progress row for the prerequisite skill.
    const prerequisiteProgress = progressRows.find(
      (row) => row.skill_id === prerequisite.prerequisite_skill_id,
    );

    // This returns true only when that prerequisite is completed.
    return prerequisiteProgress?.status === "completed";
  }).length;

  // This starts with the saved status if it exists.
  // If there is no saved progress row, the skill starts as locked.
  let status = progress?.status || "locked";

  // This makes a skill available immediately when it has no prerequisites at all.
  if (status === "locked" && prerequisites.length === 0) {
    status = "available";
  }

  // This also makes a skill available when every prerequisite is completed.
  if (status === "locked" && prerequisites.length === completedPrerequisites) {
    status = "available";
  }

  // This returns one combined object for the frontend.
  // It keeps the original skill data and adds the calculated status and prerequisite list.
  return {
    ...skill,
    status,
    prerequisites,
  };
}

// This helper function builds the full tree detail view for the frontend.
// It loads the tree, all skills in the tree, all progress rows for the user, and all prerequisites.
async function buildTreeDetails(userId, treeId) {
  // This loads the selected tree from db/trees.js.
  const tree = await getTreeById(treeId);

  // This stops early when the tree does not exist.
  if (!tree) {
    return null;
  }

  // This loads every skill in the selected tree from db/skills.js.
  const skills = await getSkillsByTreeId(treeId);

  // This loads the current user's saved progress for skills in this tree from db/progress.js.
  const progressRows = await getProgressByTreeId(userId, treeId);

  // This creates an empty list that will collect every prerequisite row for the tree.
  const prerequisiteRows = [];

  // This loops through each skill in the tree.
  for (const skill of skills) {
    // This loads the prerequisite rows for one skill from db/prerequisites.js.
    const skillPrerequisites = await getPrerequisitesBySkillId(skill.id);

    // This adds those rows into the big combined list.
    prerequisiteRows.push(...skillPrerequisites);
  }

  // This builds a frontend-friendly version of every skill by using the helper above.
  const skillsWithDetails = skills.map((skill) =>
    buildSkillDetails(skill, prerequisiteRows, progressRows),
  );

  // This returns the combined tree detail object to the route that called it.
  return {
    tree,
    skills: skillsWithDetails,
    progress: progressRows,
  };
}

// This helper function makes sure the request includes a real user.
// Many routes call this first before doing anything else.
async function requireUser(request, response) {
  // This reads the requested user id from the query string or body.
  const userId = getRequestedUserId(request);

  // This sends an error if the request did not include a usable user id.
  if (!userId) {
    response.status(400).json({ error: "userId is required." });
    return null;
  }

  // This looks up the user row in the database.
  const user = await getUserById(userId);

  // This sends an error if the user does not exist.
  if (!user) {
    response.status(404).json({ error: "User not found." });
    return null;
  }

  // This returns the user row when the request is valid.
  return user;
}

// This route handles requests to the root URL.
// It gives a simple JSON message so the backend URL does not show a 404 page.
app.get("/", (_request, response) => {
  // This sends a JSON message back to the browser.
  response.json({ message: "Skill Tree Builder API is running." });
});

// This route is a basic health check.
// It is useful for quickly testing whether the backend is alive.
app.get("/api/health", (_request, response) => {
  // This sends a simple JSON success response.
  response.json({ ok: true });
});

// This route creates a new user account.
app.post("/api/auth/register", async (request, response) => {
  // This pulls the name, email, and password from the request body sent by the frontend.
  const { name, email, password } = request.body;
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = String(name || "").trim();

  // This checks that all three required values were sent.
  // WHY (Functionality): Trimming and validating inputs reduces avoidable account bugs from
  // accidental whitespace and keeps register behavior reliable for normal use.
  if (!trimmedName || !normalizedEmail || !password) {
    response
      .status(400)
      .json({ error: "Name, email, and password are required." });
    return;
  }

  // This looks for an existing user with the same email.
  const existingUser = await getUserByEmail(normalizedEmail);

  // This blocks duplicate accounts.
  if (existingUser) {
    response
      .status(409)
      .json({ error: "A user with that email already exists." });
    return;
  }

  // This creates the new user by calling the helper in db/users.js.
  // WHY (Functionality): Hashing before insert means we never store readable passwords.
  const passwordHash = await hashPassword(password);
  const user = await createUser(trimmedName, normalizedEmail, passwordHash);

  // This sends the new user row back to the frontend as JSON.
  response.status(201).json({ user: toSafeUser(user) });
});

// This route logs in an existing user.
app.post("/api/auth/login", async (request, response) => {
  // This reads the email and password from the frontend request body.
  const { email, password } = request.body;
  const normalizedEmail = normalizeEmail(email);

  // This checks that both values were provided.
  if (!normalizedEmail || !password) {
    response.status(400).json({ error: "Email and password are required." });
    return;
  }

  // This looks up the user by email.
  const user = await getUserByEmail(normalizedEmail);

  // This checks that the user exists and that the password matches.
  // WHY (Functionality): Compare against hashed passwords to keep login secure and dependable.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    response.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  // This sends the matching user row back to the frontend.
  response.json({ user: toSafeUser(user) });
});

// This route gets the current user by userId.
// The frontend uses this when restoring a saved user from localStorage.
app.get("/api/auth/me", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This sends the user row back to the frontend.
  // WHY (Functionality): /me should follow the same safe response shape as other auth routes.
  response.json({ user: toSafeUser(user) });
});

// This route gets one user by id directly from the URL.
app.get("/api/users/:id", async (request, response) => {
  // This looks up the user by the id in the URL.
  const user = await getUserById(request.params.id);

  // This sends an error if no matching user was found.
  if (!user) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  // This sends the user row back to the client.
  // WHY (Functionality): Keep user responses consistent and avoid leaking password_hash.
  response.json({ user: toSafeUser(user) });
});

// This route gets all trees for the current user.
app.get("/api/trees", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads all trees that belong to that user.
  const trees = await getTreesByUserId(user.id);

  // This sends the tree list back to the frontend.
  response.json({ trees });
});

// This route creates a new tree for the current user.
app.post("/api/trees", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This reads the tree values from the request body.
  const { title, description, isPublic } = request.body;

  // This checks that the required title exists.
  if (!title) {
    response.status(400).json({ error: "Title is required." });
    return;
  }

  // This creates the tree by calling the helper in db/trees.js.
  const tree = await createTree(
    user.id,
    title,
    description || "",
    Boolean(isPublic),
  );

  // This sends the new tree row back to the frontend.
  response.status(201).json({ tree });
});

// This route gets one full tree detail object.
app.get("/api/trees/:treeId", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads the combined tree detail object.
  const detail = await buildTreeDetails(user.id, Number(request.params.treeId));

  // This sends an error if the tree does not exist.
  if (!detail) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This makes sure the tree belongs to the current user.
  if (detail.tree.user_id !== user.id) {
    response
      .status(403)
      .json({ error: "You do not have access to this tree." });
    return;
  }

  // This sends the full tree detail back to the frontend.
  response.json(detail);
});

// This route updates one tree.
app.patch("/api/trees/:treeId", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads the tree being updated.
  const tree = await getTreeById(Number(request.params.treeId));

  // This sends an error if the tree does not exist.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This blocks a user from editing a tree they do not own.
  if (tree.user_id !== user.id) {
    response
      .status(403)
      .json({ error: "You do not have access to this tree." });
    return;
  }

  // This reads the updated values from the request body.
  const { title, description, isPublic } = request.body;

  // This checks that the tree still has a title.
  if (!title) {
    response.status(400).json({ error: "Title is required." });
    return;
  }

  // This updates the tree by calling the helper in db/trees.js.
  const updatedTree = await updateTree(
    tree.id,
    title,
    description || "",
    Boolean(isPublic),
  );

  // This sends the updated tree row back to the frontend.
  response.json({ tree: updatedTree });
});

// This route deletes one tree.
app.delete("/api/trees/:treeId", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads the tree being deleted.
  const tree = await getTreeById(Number(request.params.treeId));

  // This sends an error if the tree does not exist.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This blocks a user from deleting a tree they do not own.
  if (tree.user_id !== user.id) {
    response
      .status(403)
      .json({ error: "You do not have access to this tree." });
    return;
  }

  // This deletes the tree by calling the helper in db/trees.js.
  await deleteTree(tree.id);

  // This sends a simple success message back to the frontend.
  response.json({ message: "Tree deleted." });
});

// This route gets every skill in one tree.
app.get("/api/trees/:treeId/skills", async (request, response) => {
  // This loads the selected tree first.
  const tree = await getTreeById(Number(request.params.treeId));

  // This sends an error if the tree does not exist.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This loads all skills that belong to that tree.
  const skills = await getSkillsByTreeId(tree.id);

  // This sends the skill list back to the frontend.
  response.json({ skills });
});

// This route creates one skill inside a tree.
app.post("/api/trees/:treeId/skills", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads the tree the skill should belong to.
  const tree = await getTreeById(Number(request.params.treeId));

  // This sends an error if the tree does not exist.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This blocks a user from adding skills to another user's tree.
  if (tree.user_id !== user.id) {
    response
      .status(403)
      .json({ error: "You do not have access to this tree." });
    return;
  }

  // This reads the new skill values from the request body.
  const { title, description, difficulty } = request.body;

  // This checks that the required title exists.
  if (!title) {
    response.status(400).json({ error: "Title is required." });
    return;
  }

  // This creates the skill by calling the helper in db/skills.js.
  const skill = await createSkill(
    tree.id,
    title,
    description || "",
    difficulty || "",
  );

  // This sends the new skill row back to the frontend.
  response.status(201).json({ skill });
});

// This route updates one skill.
app.patch("/api/skills/:skillId", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This sends an error if the skill does not exist.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This loads the skill's tree so ownership can be checked.
  const tree = await getTreeById(skill.tree_id);

  // This blocks a user from editing another user's skill.
  if (tree.user_id !== user.id) {
    response
      .status(403)
      .json({ error: "You do not have access to this skill." });
    return;
  }

  // This reads the updated values from the request body.
  const { title, description, difficulty } = request.body;

  // This checks that the title still exists.
  if (!title) {
    response.status(400).json({ error: "Title is required." });
    return;
  }

  // This updates the skill by calling the helper in db/skills.js.
  const updatedSkill = await updateSkill(
    skill.id,
    title,
    description || "",
    difficulty || "",
  );

  // This sends the updated skill row back to the frontend.
  response.json({ skill: updatedSkill });
});

// This route deletes one skill.
app.delete("/api/skills/:skillId", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This sends an error if the skill does not exist.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This loads the skill's tree so ownership can be checked.
  const tree = await getTreeById(skill.tree_id);

  // This blocks a user from deleting another user's skill.
  if (tree.user_id !== user.id) {
    response
      .status(403)
      .json({ error: "You do not have access to this skill." });
    return;
  }

  // This deletes the skill by calling the helper in db/skills.js.
  await deleteSkill(skill.id);

  // This sends a simple success message.
  response.json({ message: "Skill deleted." });
});

// This route gets all prerequisites for one skill.
app.get("/api/skills/:skillId/prerequisites", async (request, response) => {
  // This loads the selected skill first.
  const skill = await getSkillById(Number(request.params.skillId));

  // This sends an error if the skill does not exist.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This loads the prerequisite rows from db/prerequisites.js.
  const prerequisites = await getPrerequisitesBySkillId(skill.id);

  // This sends the prerequisite list back to the frontend.
  response.json({ prerequisites });
});

// This route creates one prerequisite relationship.
app.post("/api/skills/:skillId/prerequisites", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This sends an error if the skill does not exist.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This loads the skill's tree so ownership can be checked.
  const tree = await getTreeById(skill.tree_id);

  // This blocks a user from editing another user's skill.
  if (tree.user_id !== user.id) {
    response
      .status(403)
      .json({ error: "You do not have access to this skill." });
    return;
  }

  // This reads the prerequisite skill id from the request body.
  const prerequisiteSkillId = Number(request.body.prerequisiteSkillId);

  // This checks that a real prerequisite id was sent.
  if (!prerequisiteSkillId) {
    response.status(400).json({ error: "prerequisiteSkillId is required." });
    return;
  }

  // This stops a skill from depending on itself.
  if (prerequisiteSkillId === skill.id) {
    response.status(400).json({ error: "A skill cannot depend on itself." });
    return;
  }

  // This loads the prerequisite skill from db/skills.js.
  const prerequisiteSkill = await getSkillById(prerequisiteSkillId);

  // This checks that the chosen prerequisite is in the same tree.
  if (!prerequisiteSkill || prerequisiteSkill.tree_id !== skill.tree_id) {
    response
      .status(400)
      .json({ error: "Choose a prerequisite from the same tree." });
    return;
  }

  // This tries to save the new prerequisite relationship.
  try {
    const prerequisite = await createPrerequisite(
      skill.id,
      prerequisiteSkillId,
    );
    response.status(201).json({ prerequisite });
  } catch {
    // This handles duplicate prerequisite rows.
    response.status(409).json({ error: "That prerequisite already exists." });
  }
});

// This route deletes one prerequisite relationship.
app.delete(
  "/api/skills/:skillId/prerequisites/:prereqId",
  async (request, response) => {
    // This validates the user first.
    const user = await requireUser(request, response);

    // This stops the route if the helper already sent an error response.
    if (!user) {
      return;
    }

    // This loads the selected skill.
    const skill = await getSkillById(Number(request.params.skillId));

    // This sends an error if the skill does not exist.
    if (!skill) {
      response.status(404).json({ error: "Skill not found." });
      return;
    }

    // This loads the skill's tree so ownership can be checked.
    const tree = await getTreeById(skill.tree_id);

    // This blocks a user from editing another user's skill.
    if (tree.user_id !== user.id) {
      response
        .status(403)
        .json({ error: "You do not have access to this skill." });
      return;
    }

    // This deletes the prerequisite row by calling the helper in db/prerequisites.js.
    await deletePrerequisite(Number(request.params.prereqId));

    // This sends a simple success message back to the frontend.
    response.json({ message: "Prerequisite deleted." });
  },
);

// This route gets progress for all skills in one tree.
app.get("/api/trees/:treeId/progress", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads the selected tree.
  const tree = await getTreeById(Number(request.params.treeId));

  // This sends an error if the tree does not exist.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This loads the progress rows by calling the helper in db/progress.js.
  const progress = await getProgressByTreeId(user.id, tree.id);

  // This sends the progress rows back to the frontend.
  response.json({ progress });
});

// This route updates one skill's progress.
app.patch("/api/skills/:skillId/progress", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This sends an error if the skill does not exist.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This reads the requested status from the request body.
  const status = request.body.status;

  // This checks that the status is one of the allowed values.
  if (!allowedStatuses.includes(status)) {
    response.status(400).json({ error: "Choose a valid progress status." });
    return;
  }

  // This checks whether all prerequisites are completed for this skill.
  const prerequisitesCompleted = await prerequisitesAreCompleted(
    user.id,
    skill.id,
  );

  // This checks how many prerequisites this skill has.
  const prerequisiteCount = await countPrerequisitesForSkill(skill.id);

  // This blocks progress changes when prerequisites still are not complete.
  if (status !== "locked" && prerequisiteCount > 0 && !prerequisitesCompleted) {
    response.status(400).json({ error: "Complete the prerequisites first." });
    return;
  }

  // This saves the progress row by calling the helper in db/progress.js.
  const progress = await upsertProgress(user.id, skill.id, status);

  // This sends the saved progress row back to the frontend.
  response.json({ progress });
});

// This route gets simple dashboard summary data.
app.get("/api/dashboard", async (request, response) => {
  // This validates the user first.
  const user = await requireUser(request, response);

  // This stops the route if the helper already sent an error response.
  if (!user) {
    return;
  }

  // This loads all trees for the current user.
  const trees = await getTreesByUserId(user.id);

  // This creates an empty list that will hold summary rows for each tree.
  const summary = [];

  // This loops through each tree.
  for (const tree of trees) {
    // This builds the full detail object for that tree.
    const detail = await buildTreeDetails(user.id, tree.id);

    // This counts how many skills are completed in that tree.
    const completedCount = detail.skills.filter(
      (skill) => skill.status === "completed",
    ).length;

    // This adds a summary object into the final summary list.
    summary.push({
      treeId: tree.id,
      title: tree.title,
      totalSkills: detail.skills.length,
      completedSkills: completedCount,
    });
  }

  // This sends the dashboard data back to the frontend.
  response.json({ user, trees, summary });
});

// This starts the backend server listening on the selected port.
app.listen(PORT, () => {
  // This logs a message in the terminal so you know the server started.
  console.log(`Listening on port ${PORT}`);
});
