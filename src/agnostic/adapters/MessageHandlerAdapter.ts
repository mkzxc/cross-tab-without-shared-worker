import { SW_TO_DW_MESSAGE_TYPES, TAB_TO_DW_MESSAGE_TYPES } from "../const";
import type { DWToSWMessage, SWToDWMessage, TabToDWMessage } from "../types";
import type { ActionData } from "./types";

type HandlerData<T, K> = {
  key: T;
  data: K;
};

type HandlerPayload<T extends ActionData> = {
  [K in Extract<keyof T, string>]: HandlerData<K, Parameters<T[K]>[0]>;
}[Extract<keyof T, string>];

/**
 * Shapes user data handler so that it fits into library architecture
 */
class MessageHandlerAdapter<T extends ActionData> {
  #initializerDW: () => void;
  #port: MessagePort | null = null;

  //TODO This name can be misleading due to actual implementation
  private isTabMessage = (data: unknown): data is TabToDWMessage => {
    return Boolean(
      typeof data === "object" &&
      data &&
      "type" in data &&
      typeof data.type === "string" &&
      TAB_TO_DW_MESSAGE_TYPES.includes(
        data.type as (typeof TAB_TO_DW_MESSAGE_TYPES)[number],
      ),
    );
  };

  private isSWMessage = (data: unknown): data is SWToDWMessage => {
    return Boolean(
      typeof data === "object" &&
      data &&
      "type" in data &&
      typeof data.type === "string" &&
      SW_TO_DW_MESSAGE_TYPES.includes(
        data.type as (typeof SW_TO_DW_MESSAGE_TYPES)[number],
      ),
    );
  };

  private postMessageToSW = (message: DWToSWMessage) => {
    if (!this.#port) {
      //Should never happen
      throw new Error("DW: MessagePort not available");
    }
    this.#port.postMessage(message);
  };

  /**
   * @param cb Injected constructor handler
   */
  private handleSWMessage = (
    data: SWToDWMessage,
    cb: (payload: HandlerPayload<T>) => unknown,
  ) => {
    if (!this.#port) {
      //Should never happen
      throw new Error("DW: MessagePort not available");
    }
    if (data.type === "PING") {
      this.postMessageToSW({ type: "PONG" });
      return;
    }
    //TODO Support async handler cb?
    const result = cb(data.payload as Parameters<typeof cb>[0]);
    this.postMessageToSW({
      type: "SUCCESS",
      result: result || null,
    });
  };

  /**
   * @param handler This callback should handle all the possible sent message that are differentiated by the key
   */
  constructor(handler: (payload: HandlerPayload<T>) => unknown) {
    this.#initializerDW = () => {
      self.postMessage({ type: "READY" });
      self.addEventListener("message", (event) => {
        if (!this.isTabMessage(event.data)) {
          console.error(
            `Unsupported message, DW expects TabToDWMessage`,
            event.data,
          );
          return;
        }
        this.#port = event.data.payload;

        this.#port.onmessage = (e) => {
          if (!this.isSWMessage(e.data)) {
            console.error(
              `Unsupported message, DW expects SWToDWMessage`,
              event.data,
            );
            return;
          }

          try {
            this.handleSWMessage(e.data, handler);
          } catch (error) {
            if (!this.#port) {
              //Should never happen
              throw new Error("DW: MessagePort not available");
            }

            //TODO Advise user to throw Error object in all error cases
            let externalError = new Error("Unknown error");
            if (error instanceof Error) {
              externalError = error;
            }

            this.postMessageToSW({
              type: "FAILURE",
              error: externalError.message,
            });
          }
        };
      });
    };
  }

  getInitializerDW = () => {
    return this.#initializerDW;
  };
}

export { MessageHandlerAdapter };
