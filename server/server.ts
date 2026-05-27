import app from "./src/index";

Bun.serve({
  port: 3000,
  fetch: app.fetch,
});
console.log("Server running at http://localhost:3000");