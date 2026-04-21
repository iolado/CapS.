// This imports the pg package so we can use PostgreSQL in this project.
import pg from "pg";

// This creates a variable called url.
const url =
  // This first checks if there is a DATABASE_URL in the environment.
  process.env.DATABASE_URL
  // If there is no DATABASE_URL, it uses this local database connection string instead.
  // "postgres://ifeoladokun:password@localhost:5432/skill_tree_builder";

// This creates a new PostgreSQL client using the url above.
const db = new pg.Client(url);

// This exports the database client so other files can use it.
export default db;
