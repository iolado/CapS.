// This imports the shared database client from client.js.
// This file uses that client to connect to PostgreSQL before inserting sample data.
import db from "./client.js";

// This imports the tree creation helper from trees.js.
// seed.js calls this helper to create sample trees.
import { createTree } from "./trees.js";

// This imports the skill creation helper from skills.js.
// seed.js calls this helper to create sample skills.
import { createSkill } from "./skills.js";

// This imports the prerequisite creation helper from prerequisites.js.
// seed.js calls this helper to connect skills together.
import { createPrerequisite } from "./prerequisites.js";

// This imports the progress helper from progress.js.
// seed.js calls this helper to add sample progress data.
import { upsertProgress } from "./progress.js";

// This imports the user creation helper from users.js.
// seed.js calls this helper to create a sample user.
import { createUser } from "./users.js";

// This connects to the database before we try to seed data.
await db.connect();

// This starts a try/finally block so the database connection always closes at the end.
try {
  // This creates one sample user and stores the returned row in demoUser.
  const demoUser = await createUser("Demo User", "demo@example.com", "password123");

  // This creates one sample tree for the demo user.
  await createTree(
    demoUser.id,
    "Frontend Developer Path",
    "A simple path for learning HTML, CSS, JavaScript, and React.",
    false
  );

  // This creates a second sample tree and stores the returned row in dataScienceTree.
  const dataScienceTree = await createTree(
    demoUser.id,
    "Data Science Roadmap",
    "A simple path for learning Python, data analysis, and machine learning.",
    true
  );

  // This creates the first sample skill inside the second tree.
  const pythonSkill = await createSkill(
    dataScienceTree.id,
    "Learn Python",
    "Practice Python basics and write simple scripts.",
    "Beginner"
  );

  // This creates the second sample skill inside the second tree.
  const pandasSkill = await createSkill(
    dataScienceTree.id,
    "Learn Pandas",
    "Use data frames to clean and explore data.",
    "Intermediate"
  );

  // This creates the third sample skill inside the second tree.
  const machineLearningSkill = await createSkill(
    dataScienceTree.id,
    "Machine Learning Basics",
    "Train simple models and understand basic evaluation.",
    "Intermediate"
  );

  // creates a prerequisite so Pandas depends on Python.
  await createPrerequisite(pandasSkill.id, pythonSkill.id);

  //  creates a prerequisite so Machine Learning depends on Pandas.
  await createPrerequisite(machineLearningSkill.id, pandasSkill.id);

  // marks Python as completed for the demo user.
  await upsertProgress(demoUser.id, pythonSkill.id, "completed");

  // marks Pandas as in progress for the demo user.
  await upsertProgress(demoUser.id, pandasSkill.id, "in_progress");

  // This logs a success message in the terminal after seeding is finished.
  console.log("Database seeded.");
} finally {
  // This closes the database connection whether the seed worked or failed.
  await db.end();
}
