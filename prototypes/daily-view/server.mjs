import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const htmlPath = fileURLToPath(new URL("./index.html", import.meta.url));

createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${host}`).pathname;

  if (pathname !== "/" && pathname !== "/index.html") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const html = await readFile(htmlPath);
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": "text/html; charset=utf-8"
  });
  response.end(html);
}).listen(port, host, () => {
  console.log(`\u00c7etele daily-view prototype: http://${host}:${port}/?variant=C`);
});
