//TODO If possible, handle everything that is shared between JS realms in the best way memory-wise

import type { BindingSpec } from "@sqlite.org/sqlite-wasm";
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

export type { Config };
