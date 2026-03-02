import sqlite3InitModule, {
  type OpfsSAHPoolDatabase,
} from "@sqlite.org/sqlite-wasm";
import type { Row, SWToDWMessage } from "./sw/sw-types";

let db: OpfsSAHPoolDatabase | null = null;
let port: MessagePort | null = null;

async function initDB() {
  //@ts-expect-error It doesn't expect parameter, but to me it doesn't work without it
  const sqlite3 = await sqlite3InitModule({
    print: console.log,
    printErr: console.error,
    locateFile: (file: string) =>
      `/node_modules/@sqlite.org/sqlite-wasm/dist/${file}`,
  });

  if ("opfs" in sqlite3) {
    const poolUtil = await sqlite3.installOpfsSAHPoolVfs({});
    db = new poolUtil.OpfsSAHPoolDb("/myapp.sqlite3");
  } else {
    console.error("OPFS not available");
    db = new sqlite3.oo1.DB(":memory:");
  }

  // Create table on first run
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  console.log("DW: Initialized DB");
}

//TODO There must be a way to restrict the type of the postMessage param
async function handleMessage(port: MessagePort, data: SWToDWMessage) {
  try {
    if (!db) {
      //Should never happen
      throw new Error("DW: DB not initialized");
    }
    if (data.type === "EXEC") {
      db.exec("BEGIN TRANSACTION");
      try {
        db.exec({ sql: data.sql, bind: data.bind ?? [] });
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      port.postMessage({ type: "SUCCESS" });
    } else if (data.type === "QUERY") {
      const rows: Row[] = [];
      db.exec({
        sql: data.sql,
        bind: data.bind ?? [],
        rowMode: "object",
        callback: (row) => {
          rows.push(row);
        },
      });
      port.postMessage({ type: "SUCCESS", rows });
    }
  } catch (err) {
    port.postMessage({ type: "FAILURE", error: (err as Error).message });
  }
}

initDB().then(() => {
  self.postMessage({ type: "READY" });
  self.addEventListener("message", (event) => {
    if (event.data.type === "SW_PORT") {
      port = event.data.port as MessagePort;
      port.onmessage = (e: MessageEvent) => {
        try {
          if (!port) {
            //Should never happen
            throw new Error("MessagePort not available");
          }
          if (e.data.type === "PING") {
            port.postMessage({ type: "PONG" });
            return;
          }
          handleMessage(port, e.data);
        } catch (error) {
          console.error("Port OnMessage error:", error);
        }
      };
    }
  });
});
