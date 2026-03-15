import { setupButtons } from "../../buttons";
import { setupReact } from "../../react";
import { QUERY_KEYS } from "../../react/api/queryKeys";
import { queryClient } from "../../react/core/frameworks/network";
import { Provider, type Config } from "../provider";
import { Tab } from "../tab";
import { CONFIGS_KEY } from "./const";

const configs = new Set<Config>();
configs.add({
  key: CONFIGS_KEY.getMessage,
  // fetcher: getMessages,
  onSuccess: () => {},
  onError: (error) =>
    console.error("Error printed by config linked with get cb", error),
});
configs.add({
  key: CONFIGS_KEY.postMessage,
  // fetcher: postMessage,
  onSuccess: () =>
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.messages],
    }),
  onError: (error) =>
    console.error("Error printed by config linked with post cb", error),
});
const provider = new Provider(configs);

const tab = new Tab(provider);

tab.setup().then(() => {
  //IDK do what you need to do
  setupButtons();
  setupReact();
});
