// This imports the database client.
import db from "./client.js";
// This imports the tree creation function.
import { createTree } from "./trees.js";
// This imports the skill creation function.
import { createSkill } from "./skills.js";
// This imports the prerequisite creation function.
import { createPrerequisite } from "./prerequisites.js";
// This imports the progress update function.
import { upsertProgress } from "./progress.js";
// This imports the user creation function.
import { createUser } from "./users.js";

// This connects to the database.
await db.connect();

// This starts a try/finally block so the database always closes.
try {
  // This creates one sample user.
  const demoUser = await createUser("Demo User", "demo@example.com", "password123");
  // This creates one sample tree for that user.
  await createTree(
    demoUser.id,
    "Frontend Developer Path",
    "A simple path for learning HTML, CSS, JavaScript, and React.",
    false
  );
  // This creates a second sample tree for the same user.
  const dataScienceTree = await createTree(
    demoUser.id,
    "Data Science Roadmap",
    "A simple path for learning Python, data analysis, and machine learning.",
    true
  );
  // This creates a few sample skills inside the second tree.
  const pythonSkill = await createSkill(
    dataScienceTree.id,
    "Learn Python",
    "Practice Python basics and write simple scripts.",
    "Beginner"
  );
  const pandasSkill = await createSkill(
    dataScienceTree.id,
    "Learn Pandas",
    "Use data frames to clean and explore data.",
    "Intermediate"
  );
  const machineLearningSkill = await createSkill(
    dataScienceTree.id,
    "Machine Learning Basics",
    "Train simple models and understand basic evaluation.",
    "Intermediate"
  );
  // This creates the prerequisite links between the sample skills.
  await createPrerequisite(pandasSkill.id, pythonSkill.id);
  await createPrerequisite(machineLearningSkill.id, pandasSkill.id);
  // This gives the sample user a little sample progress.
  await upsertProgress(demoUser.id, pythonSkill.id, "completed");
  await upsertProgress(demoUser.id, pandasSkill.id, "in_progress");
  // This logs a message after the seed finishes.
  console.log("Database seeded.");
} finally {
  // This closes the database connection.
  await db.end();
}
