import sqlite3InitModule, {
  type OpfsSAHPoolDatabase,
} from "@sqlite.org/sqlite-wasm";
import { CONFIGS_KEY } from "./const";
import { MessageHandlerAdapter } from "../adapters/MessageHandlerAdapter";

let db: OpfsSAHPoolDatabase | null = null;

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

// I will get the key from the custom header
//TODO Generic
function handleMessage<
  T extends { key: (typeof CONFIGS_KEY)[keyof typeof CONFIGS_KEY] },
>(payload: T) {
  try {
    if (!db) {
      //Should never happen
      throw new Error("DW: DB not initialized");
    }
    if (payload.key === CONFIGS_KEY.postMessage) {
      db.exec("BEGIN TRANSACTION");
      try {
        //@ts-expect-error Look above
        db.exec({ sql: payload.sql, bind: payload.bind ?? [] });
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    } else if (payload.key === CONFIGS_KEY.getMessage) {
      const rows: unknown[] = [];
      db.exec({
        //@ts-expect-error Look above
        sql: payload.sql,
        //@ts-expect-error Look above
        bind: payload.bind ?? [],
        rowMode: "object",
        callback: (row) => {
          rows.push(row);
        },
      });
      return rows;
    }
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Error in handleMessage ${JSON.stringify(err)}`);
  }
}

//TODO Look above
const adapter = new MessageHandlerAdapter<{
  key: (typeof CONFIGS_KEY)[keyof typeof CONFIGS_KEY];
}>(handleMessage);

initDB().then(() => {
  const init = adapter.getInitializerDW();
  init();
});
