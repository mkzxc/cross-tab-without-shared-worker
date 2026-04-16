import type { ActionData } from "../adapters/types";
import { SW_TO_TAB_MESSAGE_TYPES } from "../const";
import type { SWToTabMessage } from "../types";

const LIMIT = 25;

const TOPICS = SW_TO_TAB_MESSAGE_TYPES.filter(
  (type) => type === "OP_ERROR" || type === "OP_SUCCESS",
);

type Topic = (typeof TOPICS)[number];

type SubscriberCallbackPayload<T extends ActionData> = {
  key: keyof T;
  result: Extract<SWToTabMessage, { type: Topic }>["payload"];
};

type SubscriberCallback<T extends ActionData> = (
  payload: SubscriberCallbackPayload<T>,
) => void;

class EventBus<T extends ActionData> {
  #subscribers;
  #history; //TODO Needed?

  constructor() {
    this.#subscribers = new Map<
      Topic,
      {
        cb: SubscriberCallback<T>;
      }[]
    >();
    this.#history = new Map<Topic, SubscriberCallbackPayload<T>[]>();
  }

  subscribe = (topic: Topic, cb: SubscriberCallback<T>) => {
    if (!TOPICS.includes(topic)) {
      console.error("Topic not supported:", topic);
      return;
    }

    if (!this.#subscribers.has(topic)) {
      this.#subscribers.set(topic, []);
    }

    const subscription = { cb };

    this.#subscribers.get(topic)?.push(subscription);

    return () => {
      const subscriptions = this.#subscribers.get(topic);
      const index = subscriptions?.indexOf(subscription);

      if (!index) {
        console.error("Sub not found");
      } else {
        subscriptions?.splice(index, 1);
      }

      if (subscriptions && subscriptions?.length < 1) {
        this.#subscribers.delete(topic);
      }
    };
  };

  publish = async (topic: Topic, payload: SubscriberCallbackPayload<T>) => {
    if (!this.#history.has(topic)) {
      this.#history.set(topic, []);
    }

    this.#history.get(topic)?.push(payload);

    if ((this.#history.get(topic)?.length || 1) > LIMIT) {
      this.#history.get(topic)?.shift();
    }

    if (this.#subscribers.has(topic)) {
      this.#subscribers.get(topic)?.forEach((sub) => sub.cb(payload));
    }
  };
}

export { EventBus };
