// This imports Express so we can build the server.
import express from "express";
// This imports cors so the frontend can call the backend from another URL.
import cors from "cors";

// This imports the database client.
import db from "./db/client.js";
// These import the user database functions.
import {
  createUser,
  createUsersTable,
  getUserByEmail,
  getUserById,
} from "./db/users.js";
// These import the skill tree database functions.
import {
  createTree,
  createTreesTable,
  deleteTree,
  getTreeById,
  getTreesByUserId,
  updateTree,
} from "./db/trees.js";
// These import the skill database functions.
import {
  createSkill,
  createSkillsTable,
  deleteSkill,
  getSkillById,
  getSkillsByTreeId,
  updateSkill,
} from "./db/skills.js";
// These import the prerequisite database functions.
import {
  countPrerequisitesForSkill,
  createPrerequisite,
  createSkillPrerequisitesTable,
  deletePrerequisite,
  getPrerequisitesBySkillId,
} from "./db/prerequisites.js";
// These import the progress database functions.
import {
  createUserSkillProgressTable,
  getProgressByTreeId,
  prerequisitesAreCompleted,
  upsertProgress,
} from "./db/progress.js";

// This sets the port for the server.
const PORT = process.env.PORT || 3001;
// These are the frontend URLs that are allowed to talk to this API.
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://caps-fe.netlify.app",
];
// These are the allowed progress values.
const allowedStatuses = ["locked", "in_progress", "completed"];

// This creates the Express app.
const app = express();

// This connects to the database.
await db.connect();
// This makes sure the users table exists.
await createUsersTable();
// This makes sure the skill_trees table exists.
await createTreesTable();
// This makes sure the skills table exists.
await createSkillsTable();
// This makes sure the prerequisite table exists.
await createSkillPrerequisitesTable();
// This makes sure the progress table exists.
await createUserSkillProgressTable();

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

// This helper reads a user id from the query or request body.
function getRequestedUserId(request) {
  // This tries the query string first and then the request body.
  return Number(request.query.userId || request.body.userId);
}

// This helper builds one skill detail object for the frontend.
function buildSkillDetails(skill, prerequisiteRows, progressRows) {
  // This finds the saved progress row for this skill.
  const progress = progressRows.find((row) => row.skill_id === skill.id);
  // This gets the prerequisite rows for this skill.
  const prerequisites = prerequisiteRows.filter((row) => row.skill_id === skill.id);
  // This counts how many prerequisites are completed.
  const completedPrerequisites = prerequisites.filter((prerequisite) => {
    const prerequisiteProgress = progressRows.find(
      (row) => row.skill_id === prerequisite.prerequisite_skill_id
    );

    return prerequisiteProgress?.status === "completed";
  }).length;

  // This picks a status for the frontend.
  let status = progress?.status || "locked";

  // This makes a skill available when it has no prerequisites.
  if (status === "locked" && prerequisites.length === 0) {
    status = "available";
  }

  // This makes a skill available when every prerequisite is completed.
  if (status === "locked" && prerequisites.length === completedPrerequisites) {
    status = "available";
  }

  // This returns the full skill object for the client.
  return {
    ...skill,
    status,
    prerequisites,
  };
}

// This helper builds the full tree detail response.
async function buildTreeDetails(userId, treeId) {
  // This loads the selected tree.
  const tree = await getTreeById(treeId);

  // This stops when the tree does not exist.
  if (!tree) {
    return null;
  }

  // This loads all skills for the selected tree.
  const skills = await getSkillsByTreeId(treeId);
  // This loads progress for the current user.
  const progressRows = await getProgressByTreeId(userId, treeId);
  // This loads every prerequisite row for the selected tree.
  const prerequisiteRows = [];

  // This loops through each skill and gathers its prerequisites.
  for (const skill of skills) {
    const skillPrerequisites = await getPrerequisitesBySkillId(skill.id);
    prerequisiteRows.push(...skillPrerequisites);
  }

  // This builds the final skill list with statuses.
  const skillsWithDetails = skills.map((skill) =>
    buildSkillDetails(skill, prerequisiteRows, progressRows)
  );

  // This returns the final tree detail object.
  return {
    tree,
    skills: skillsWithDetails,
    progress: progressRows,
  };
}

// This helper makes sure a user id was sent.
async function requireUser(request, response) {
  // This reads the user id from the request.
  const userId = getRequestedUserId(request);

  // This stops when the request does not include a valid user id.
  if (!userId) {
    response.status(400).json({ error: "userId is required." });
    return null;
  }

  // This looks up the matching user.
  const user = await getUserById(userId);

  // This stops when the user does not exist.
  if (!user) {
    response.status(404).json({ error: "User not found." });
    return null;
  }

  // This returns the user row.
  return user;
}

// This route shows a simple message at the root URL.
app.get("/", (_request, response) => {
  response.json({ message: "Skill Tree Builder API is running." });
});

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
app.get("/api/auth/me", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This sends the user back to the client.
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
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This gets all trees that belong to that user.
  const trees = await getTreesByUserId(user.id);
  // This sends the tree list back to the client.
  response.json({ trees });
});

// This route creates a new tree.
app.post("/api/trees", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This takes the values from the request body.
  const { title, description, isPublic } = request.body;

  // This checks that the required values were sent.
  if (!title) {
    response.status(400).json({ error: "Title is required." });
    return;
  }

  // This creates the new tree in the database.
  const tree = await createTree(user.id, title, description || "", Boolean(isPublic));
  // This sends the new tree back to the client.
  response.status(201).json({ tree });
});

// This route gets one full tree view.
app.get("/api/trees/:treeId", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the full tree detail object.
  const detail = await buildTreeDetails(user.id, Number(request.params.treeId));

  // This returns a 404 if the tree was not found.
  if (!detail) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This makes sure users only see their own trees.
  if (detail.tree.user_id !== user.id) {
    response.status(403).json({ error: "You do not have access to this tree." });
    return;
  }

  // This sends the full tree detail back to the client.
  response.json(detail);
});

// This route updates one tree.
app.patch("/api/trees/:treeId", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the selected tree.
  const tree = await getTreeById(Number(request.params.treeId));

  // This returns a 404 if the tree was not found.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This stops users from editing another user's tree.
  if (tree.user_id !== user.id) {
    response.status(403).json({ error: "You do not have access to this tree." });
    return;
  }

  // This reads the updated values from the request body.
  const { title, description, isPublic } = request.body;

  // This checks that the title still exists.
  if (!title) {
    response.status(400).json({ error: "Title is required." });
    return;
  }

  // This updates the tree in the database.
  const updatedTree = await updateTree(
    tree.id,
    title,
    description || "",
    Boolean(isPublic)
  );

  // This sends the updated tree back to the client.
  response.json({ tree: updatedTree });
});

// This route deletes one tree.
app.delete("/api/trees/:treeId", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the selected tree.
  const tree = await getTreeById(Number(request.params.treeId));

  // This returns a 404 if the tree was not found.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This stops users from deleting another user's tree.
  if (tree.user_id !== user.id) {
    response.status(403).json({ error: "You do not have access to this tree." });
    return;
  }

  // This deletes the tree.
  await deleteTree(tree.id);
  // This sends a simple success message.
  response.json({ message: "Tree deleted." });
});

// This route gets every skill for one tree.
app.get("/api/trees/:treeId/skills", async (request, response) => {
  // This loads the selected tree.
  const tree = await getTreeById(Number(request.params.treeId));

  // This returns a 404 if the tree was not found.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This gets all skills for the tree.
  const skills = await getSkillsByTreeId(tree.id);
  // This sends the skills back to the client.
  response.json({ skills });
});

// This route creates one skill inside a tree.
app.post("/api/trees/:treeId/skills", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the selected tree.
  const tree = await getTreeById(Number(request.params.treeId));

  // This returns a 404 if the tree was not found.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This stops users from editing another user's tree.
  if (tree.user_id !== user.id) {
    response.status(403).json({ error: "You do not have access to this tree." });
    return;
  }

  // This reads the new skill values.
  const { title, description, difficulty } = request.body;

  // This checks that the title exists.
  if (!title) {
    response.status(400).json({ error: "Title is required." });
    return;
  }

  // This creates the skill in the database.
  const skill = await createSkill(tree.id, title, description || "", difficulty || "");
  // This sends the skill back to the client.
  response.status(201).json({ skill });
});

// This route updates one skill.
app.patch("/api/skills/:skillId", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This returns a 404 if the skill was not found.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This loads the skill's tree so ownership can be checked.
  const tree = await getTreeById(skill.tree_id);

  // This stops users from editing another user's skill.
  if (tree.user_id !== user.id) {
    response.status(403).json({ error: "You do not have access to this skill." });
    return;
  }

  // This reads the updated values.
  const { title, description, difficulty } = request.body;

  // This checks that the title still exists.
  if (!title) {
    response.status(400).json({ error: "Title is required." });
    return;
  }

  // This updates the skill in the database.
  const updatedSkill = await updateSkill(
    skill.id,
    title,
    description || "",
    difficulty || ""
  );

  // This sends the updated skill back to the client.
  response.json({ skill: updatedSkill });
});

// This route deletes one skill.
app.delete("/api/skills/:skillId", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This returns a 404 if the skill was not found.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This loads the skill's tree so ownership can be checked.
  const tree = await getTreeById(skill.tree_id);

  // This stops users from deleting another user's skill.
  if (tree.user_id !== user.id) {
    response.status(403).json({ error: "You do not have access to this skill." });
    return;
  }

  // This deletes the skill.
  await deleteSkill(skill.id);
  // This sends a simple success message.
  response.json({ message: "Skill deleted." });
});

// This route gets the prerequisites for one skill.
app.get("/api/skills/:skillId/prerequisites", async (request, response) => {
  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This returns a 404 if the skill was not found.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This gets the prerequisite rows for the selected skill.
  const prerequisites = await getPrerequisitesBySkillId(skill.id);
  // This sends the prerequisite rows back to the client.
  response.json({ prerequisites });
});

// This route creates one prerequisite relationship.
app.post("/api/skills/:skillId/prerequisites", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This returns a 404 if the skill was not found.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This loads the skill's tree so ownership can be checked.
  const tree = await getTreeById(skill.tree_id);

  // This stops users from editing another user's skill.
  if (tree.user_id !== user.id) {
    response.status(403).json({ error: "You do not have access to this skill." });
    return;
  }

  // This reads the prerequisite skill id from the request body.
  const prerequisiteSkillId = Number(request.body.prerequisiteSkillId);

  // This checks that a real prerequisite id was sent.
  if (!prerequisiteSkillId) {
    response.status(400).json({ error: "prerequisiteSkillId is required." });
    return;
  }

  // This stops a skill from pointing to itself.
  if (prerequisiteSkillId === skill.id) {
    response.status(400).json({ error: "A skill cannot depend on itself." });
    return;
  }

  // This loads the prerequisite skill.
  const prerequisiteSkill = await getSkillById(prerequisiteSkillId);

  // This checks that the prerequisite skill exists in the same tree.
  if (!prerequisiteSkill || prerequisiteSkill.tree_id !== skill.tree_id) {
    response.status(400).json({ error: "Choose a prerequisite from the same tree." });
    return;
  }

  // This creates the prerequisite relationship.
  try {
    const prerequisite = await createPrerequisite(skill.id, prerequisiteSkillId);
    response.status(201).json({ prerequisite });
  } catch {
    response.status(409).json({ error: "That prerequisite already exists." });
  }
});

// This route deletes one prerequisite relationship.
app.delete("/api/skills/:skillId/prerequisites/:prereqId", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This returns a 404 if the skill was not found.
  if (!skill) {
    response.status(404).json({ error: "Skill not found." });
    return;
  }

  // This loads the skill's tree so ownership can be checked.
  const tree = await getTreeById(skill.tree_id);

  // This stops users from editing another user's skill.
  if (tree.user_id !== user.id) {
    response.status(403).json({ error: "You do not have access to this skill." });
    return;
  }

  // This deletes the prerequisite row.
  await deletePrerequisite(Number(request.params.prereqId));
  // This sends a simple success message.
  response.json({ message: "Prerequisite deleted." });
});

// This route gets progress for all skills in one tree.
app.get("/api/trees/:treeId/progress", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the selected tree.
  const tree = await getTreeById(Number(request.params.treeId));

  // This returns a 404 if the tree was not found.
  if (!tree) {
    response.status(404).json({ error: "Tree not found." });
    return;
  }

  // This gets progress rows for the selected tree.
  const progress = await getProgressByTreeId(user.id, tree.id);
  // This sends the progress rows back to the client.
  response.json({ progress });
});

// This route updates one skill's progress.
app.patch("/api/skills/:skillId/progress", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This loads the selected skill.
  const skill = await getSkillById(Number(request.params.skillId));

  // This returns a 404 if the skill was not found.
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

  // This checks whether the user is allowed to start this skill.
  const prerequisitesCompleted = await prerequisitesAreCompleted(user.id, skill.id);
  // This checks whether the skill even has prerequisites.
  const prerequisiteCount = await countPrerequisitesForSkill(skill.id);

  // This blocks progress changes when prerequisites are not complete.
  if (status !== "locked" && prerequisiteCount > 0 && !prerequisitesCompleted) {
    response.status(400).json({ error: "Complete the prerequisites first." });
    return;
  }

  // This saves the new progress row.
  const progress = await upsertProgress(user.id, skill.id, status);
  // This sends the new progress back to the client.
  response.json({ progress });
});

// This route gets simple dashboard data.
app.get("/api/dashboard", async (request, response) => {
  // This makes sure the request includes a real user id.
  const user = await requireUser(request, response);

  // This stops when the helper already sent an error.
  if (!user) {
    return;
  }

  // This gets all trees for the selected user.
  const trees = await getTreesByUserId(user.id);
  // This stores the final summary rows.
  const summary = [];

  // This loops through each tree to calculate simple counts.
  for (const tree of trees) {
    const detail = await buildTreeDetails(user.id, tree.id);
    const completedCount = detail.skills.filter((skill) => skill.status === "completed").length;

    summary.push({
      treeId: tree.id,
      title: tree.title,
      totalSkills: detail.skills.length,
      completedSkills: completedCount,
    });
  }

  // This sends the dashboard data back to the client.
  response.json({ user, trees, summary });
});

// This starts the server.
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
