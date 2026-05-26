Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/ping") {
      return Response.json({ message: "pong from server A"});
    }
    return Response.json("Not Found", { status: 404 });
  },
});
console.log("Server running at http://localhost:3000");