//TODO
/// <reference lib="webworker" />

import sqlite3InitModule, {
  type BindingSpec,
  type OpfsSAHPoolDatabase,
} from "@sqlite.org/sqlite-wasm";
import { CONFIGS_KEY } from "./const";
import { WorkerAdapter } from "../library/adapters/WorkerAdapter";

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
    const poolUtil = await sqlite3.installOpfsSAHPoolVfs({
      directory: `/cross-tab-without-shared-worker/${self.name}`,
    });
    db = new poolUtil.OpfsSAHPoolDb(`/${self.name}.sqlite3`);
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

//TODO Handle everything that is shared between JS realms in the best way memory-wise
type DBExecBody = {
  sql: string;
  bind?: BindingSpec;
};

type ApiModel = {
  id: string;
  date: number;
  value: string;
};

const getMessage = CONFIGS_KEY["getMessage"];
const postMessage = CONFIGS_KEY["postMessage"];

type Config = {
  [getMessage]: (payload: DBExecBody) => ApiModel;
  [postMessage]: (payload: DBExecBody) => void;
};

const adapter = new WorkerAdapter<Config>((payload) => {
  try {
    if (!db) {
      //Should never happen
      throw new Error("DW: DB not initialized");
    }

    if (payload.key === CONFIGS_KEY.postMessage) {
      db.exec("BEGIN TRANSACTION");
      try {
        db.exec({ sql: payload.data.sql, bind: payload.data.bind ?? [] });
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
    } else if (payload.key === CONFIGS_KEY.getMessage) {
      const rows: unknown[] = [];
      db.exec({
        sql: payload.data.sql,
        bind: payload.data.bind ?? [],
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
});

initDB().then(() => {
  const init = adapter.getInitializerDW();
  init();
});
