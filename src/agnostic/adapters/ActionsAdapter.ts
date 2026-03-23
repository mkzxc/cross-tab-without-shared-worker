import type { Action } from "../entities/action";

//https://stackoverflow.com/a/68352232
type ActionsConfig<T> = {
  [K in Extract<keyof T, string>]-?: Action<K, T[K]>;
}[Extract<keyof T, string>];

class ActionsAdapter<T> {
  #actions;

  constructor(config: ActionsConfig<T>[]) {
    this.#actions = new Map<
      (typeof config)[number]["key"],
      {
        onSuccess: (typeof config)[number]["onSuccess"];
        onError: (typeof config)[number]["onError"];
      }
    >();
    config.forEach((action) => {
      this.#actions.set(action.key, {
        // fetcher: config.fetcher,
        onSuccess: action.onSuccess,
        onError: action.onError,
      });
    });
  }

  //TODO I don't like this typecasting, but it should be the safest thing to do for what it's used for
  getActions(key: string) {
    return this.#actions.get(key as Extract<keyof T, string>) || null;
  }
}

export { ActionsAdapter };
