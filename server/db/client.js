// This imports the PostgreSQL package.
// We use this package to connect our JavaScript code to the PostgreSQL database.
import pg from "pg";

// This builds the database connection string.
// It uses DATABASE_URL first when the app is deployed.
// If DATABASE_URL does not exist, it falls back to the local database connection.
const url =
  process.env.DATABASE_URL ||
  "postgres://ifeoladokun:password@localhost:5432/skill_tree_builder";

// This creates one PostgreSQL client instance.
// The other db files import this client and use it to run SQL queries.
const db = new pg.Client({
  // This tells PostgreSQL which database URL to connect to.
  connectionString: url,

  // This turns on SSL when DATABASE_URL is being used.
  // That is usually needed for deployed databases like Render Postgres.
  // When running locally, SSL is turned off.
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// This exports the database client so other files can import it.
export default db;
