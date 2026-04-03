import type { BindingSpec } from "@sqlite.org/sqlite-wasm";
import { setupButtons } from "../../buttons";
import { setupReact } from "../../react";
import { QUERY_KEYS } from "../../react/api/queryKeys";
import { queryClient } from "../../react/core/frameworks/network";
import { ActionsAdapter } from "../adapters/ActionsAdapter";
import { Tab } from "../tab";
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

const actionsAdapter = new ActionsAdapter<Config>([
  {
    key: "GET_MESSAGES",
    fetchFn: (_payload) => {
      return { date: 1, id: "a", value: "abc" };
    },
    onSuccess: (_data) => {},
    onError: (error) =>
      console.error("Error printed by config linked with get cb", error),
  },
  {
    key: CONFIGS_KEY.postMessage,
    // fetcher: postMessage,
    fetchFn: (_payload) => {},
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.messages],
      }),
    onError: (error) =>
      console.error("Error printed by config linked with post cb", error),
  },
]);

const tab = new Tab(
  "/sw.js",
  new URL("./db.worker.ts", import.meta.url),
  actionsAdapter,
);

tab.setup().then(() => {
  //IDK do what you need to do
  setupButtons();
  setupReact();
});
