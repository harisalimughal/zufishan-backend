const { spawnSync } = require("child_process");

// Apply pending migrations, but don't let a transient DB/network issue here
// block the server from starting — a down migration step shouldn't take
// down an otherwise-healthy running app. /ready reports live DB status.
const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
});

if (migrate.status !== 0) {
  console.error("⚠️  prisma migrate deploy failed — starting server anyway");
}

const server = spawnSync("node", ["dist/server.js"], {
  stdio: "inherit",
  shell: true,
});

process.exit(server.status ?? 1);
