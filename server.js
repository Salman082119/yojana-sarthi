// Root convenience entry point.
// Render's default start command is `node server.js`; the real app lives in
// ./backend, so switch to it and boot the app (routes, DB, static, .env).
process.chdir(require("path").join(__dirname, "backend"));
require("./backend/server.js");