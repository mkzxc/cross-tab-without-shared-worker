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

type Config = {
  [getMessage]: { payload: DBExecBody; result: ApiModel };
  [postMessage]: { payload: DBExecBody };
};

type DBExecBody = {
  sql: string;
  bind?: BindingSpec;
};

type ApiModel = {
  id: string;
  date: number;
  value: string;
};

const actionsAdapter = new ActionsAdapter<Config>([
  {
    key: CONFIGS_KEY.getMessage,
    // fetcher: getMessages,
    onSuccess: () => {},
    onError: (error) =>
      console.error("Error printed by config linked with get cb", error),
  },
  {
    key: CONFIGS_KEY.postMessage,
    // fetcher: postMessage,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.messages],
      }),
    onError: (error) =>
      console.error("Error printed by config linked with post cb", error),
  },
]);

const tab = new Tab(actionsAdapter);

tab.setup().then(() => {
  //IDK do what you need to do
  setupButtons();
  setupReact();
});
