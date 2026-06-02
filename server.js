// Custom Node server entry — used by Passenger-based hosts (Hostinger
// "Setup Node.js App"). Point the app's "Application startup file" at this.
//
// Requires a production build first:  npm run build
// Locally you can still use `npm run dev` / `npm start` as usual.

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOST || "0.0.0.0";

const app = next({ dev: false });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res, parse(req.url || "/", true));
    }).listen(port, hostname, () => {
      // eslint-disable-next-line no-console
      console.log(`> IG Command Center ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
  });
