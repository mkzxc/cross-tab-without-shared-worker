import type { ActionsAdapter } from "./adapters/ActionsAdapter";
import type { ActionData } from "./adapters/types";
import { LOCKS } from "./const";
import type { SWToTabMessage, TabToDWMessage, TabToSWMessage } from "./types";

//I don't like this generic here, probably it's acceptable to use unknown here
class Tab<T extends ActionData> {
  //This can't be shared across instances since only one tab must have this set different to null
  #currentDW: Worker | null = null;
  #ActionsAdapter;
  #pathSW;
  #pathDW;

  constructor(
    pathServiceWorker: string | URL,
    pathWorker: string | URL,
    actionsAdapter: ActionsAdapter<T>,
  ) {
    this.#ActionsAdapter = actionsAdapter;
    this.#pathSW = pathServiceWorker;
    this.#pathDW = pathWorker;
  }

  private getActiveSW = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error("SW not active yet");
      return reg.active;
    } catch (error) {
      window.location.reload();
      throw error; //This won't ever happen, added only to narrow return type
    }
  };

  private postMessageToDW = (
    DW: Worker,
    message: TabToDWMessage,
    port: MessagePort,
  ) => {
    DW.postMessage(message, [port]);
  };

  private postMessageToSW = (
    SW: ServiceWorker,
    message: TabToSWMessage,
    port?: MessagePort,
  ) => {
    const transferable: Transferable[] = [];
    if (port) {
      transferable.push(port);
    }
    SW.postMessage(message, transferable);
  };

  private sendPortToSW = async (DW: Worker) => {
    const reg = await this.getActiveSW();
    const { port1, port2 } = new MessageChannel();
    this.postMessageToDW(DW, { type: "SW_PORT", payload: port1 }, port1);

    await new Promise((resolve) => {
      const listener = (e: MessageEvent<SWToTabMessage>) => {
        if (e.data.type === "PORT_READY") {
          navigator.serviceWorker.removeEventListener("message", listener);
          resolve(void 0);
        }
      };

      navigator.serviceWorker.addEventListener("message", listener);
      this.postMessageToSW(reg, { type: "WORKER_PORT", payload: port2 }, port2);
    });
  };

  private doesSWHaveDW = async (SW: ServiceWorker) => {
    return await new Promise<boolean>((resolve, reject) => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = (e: MessageEvent<SWToTabMessage>) => {
        if (e.data.type !== "HAS_WORKER_RESPONSE") {
          reject(
            `Unexpected message, should be: HAS_WORKER_RESPONSE instead of ${e.data.type}`,
          );
          return;
        }
        resolve(e.data.payload);
      };
      this.postMessageToSW(SW, { type: "HAS_WORKER_REQUEST" }, port2);
    });
  };

  private createDW = async () => {
    await navigator.locks.request(LOCKS.createDW, async () => {
      const reg = await this.getActiveSW();

      const hasDW = await this.doesSWHaveDW(reg);
      if (hasDW) return;

      const DW = new Worker(this.#pathDW, {
        type: "module",
      });

      await new Promise((resolve) => {
        DW.addEventListener("message", (e) => {
          if (e.data.type === "READY") resolve(void 0);
        });
      });

      this.#currentDW = DW;
      await this.sendPortToSW(DW);
    });
  };

  setup = async () => {
    navigator.serviceWorker.addEventListener(
      "message",
      async (event: MessageEvent<SWToTabMessage>) => {
        console.log("SW message:", event.data);

        if (event.data.type === "OP_SUCCESS") {
          //TODO Testing purposes
          if (
            typeof event.data.payload === "object" &&
            event.data.payload &&
            "key" in event.data.payload &&
            typeof event.data.payload.key === "string"
          ) {
            const linkedConfig = this.#ActionsAdapter.getActions(
              event.data.payload.key,
            );
            if (!linkedConfig) {
              console.error("Can't get linked config in tab handler");
            } else {
              if (
                "result" in event.data.payload &&
                typeof event.data.payload === "object"
              ) {
                //@ts-expect-error //TODO WIP
                linkedConfig.onSuccess?.(event.data.payload.result);
              }
            }
          }
        }

        if (event.data.type === "CREATE_WORKER") {
          await this.createDW();
        }

        if (event.data.type === "RESEND_PORT") {
          if (this.#currentDW) {
            await this.sendPortToSW(this.#currentDW);
          } else {
            await this.createDW();
          }
        }
      },
    );

    await navigator.serviceWorker.register(this.#pathSW, { type: "module" });
    const reg = await this.getActiveSW();

    if (!navigator.serviceWorker.controller) {
      window.location.reload();
      return;
    }

    const hasDW = await this.doesSWHaveDW(reg);

    if (!hasDW) {
      await this.createDW();
    }

    this.postMessageToSW(reg, { type: "TAB_READY" });
  };
}

export { Tab };
