import type { ENDPOINTS } from "../../api/endpoints";

//Barebone implementation of fetcher
async function fetcher(
  _url: (typeof ENDPOINTS)[keyof typeof ENDPOINTS],
  method: "POST" | "GET",
) {
  if (method === "GET") {
    return await fetch("/__db__/query", {
      method: "POST",
      body: JSON.stringify({
        sql: "SELECT * FROM messages ORDER BY id DESC LIMIT 5",
      }),
    });
  }
  return await fetch("/__db__/exec", {
    method: "POST",
    body: JSON.stringify({
      sql: "INSERT INTO messages (content, created_at) VALUES (?,?)",
      bind: ["Hello from tab!", Date.now()],
    }),
  });
}

export { fetcher };
