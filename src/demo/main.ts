import type { BindingSpec } from "@sqlite.org/sqlite-wasm";
import { setupButtons } from "./buttons";
import { setupReact } from "../react";
import { QUERY_KEYS } from "../react/api/queryKeys";
import { queryClient } from "../react/core/frameworks/network";
import { Tab } from "../library/tab";
import { CONFIGS_KEY } from "./const";

const getMessage = CONFIGS_KEY["getMessage"];
const postMessage = CONFIGS_KEY["postMessage"];

type DBExecBody = {
  sql: string;
  bind?: BindingSpec;
};

type ApiModel = {
  id: string;
  date: number;
  value: string;
};

type Config = {
  [getMessage]: (payload: DBExecBody) => ApiModel;
  [postMessage]: (payload: DBExecBody) => void;
};

const id = Math.random() > 0.5 ? "abc" : "def";

const url = new URL("./db.worker.ts", import.meta.url);
url.searchParams.set("id", id);

const tab = new Tab<Config>("/sw.js", url, id);

tab.subscribe("OP_SUCCESS", (payload) => {
  if (payload && payload.key === "POST_MESSAGE") {
    console.log("Trying sub", payload.result);
  }
});

tab.subscribe("OP_SUCCESS", (payload) => {
  if (payload && payload.key === "POST_MESSAGE") {
    console.log("Another try for sub", payload.result);
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.messages],
    });
  }
});

tab.setup().then(() => {
  //IDK do what you need to do
  setupButtons();
  setupReact();
});

export { tab };
