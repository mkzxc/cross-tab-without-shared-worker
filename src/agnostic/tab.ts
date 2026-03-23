import type { ActionsAdapter } from "./adapters/ActionsAdapter";
import { LOCKS } from "./const";
import type { SWToTabMessage } from "./types";

//I don't like this generic here, probably it's acceptable to use unknown here
class Tab<T> {
  //This can't be shared across instances since only one tab must have this set different to null
  #currentDW: Worker | null = null;
  #ActionsAdapter;

  constructor(actionsAdapter: ActionsAdapter<T>) {
    this.#ActionsAdapter = actionsAdapter;
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

  private sendPortToSW = async (DW: Worker) => {
    const reg = await this.getActiveSW();
    const { port1, port2 } = new MessageChannel();
    DW.postMessage({ type: "SW_PORT", port: port1 }, [port1]);

    await new Promise((resolve) => {
      const listener = (e: MessageEvent<SWToTabMessage>) => {
        if (e.data.type === "PORT_READY") {
          navigator.serviceWorker.removeEventListener("message", listener);
          resolve(void 0);
        }
      };

      navigator.serviceWorker.addEventListener("message", listener);
      reg.postMessage({ type: "WORKER_PORT", payload: port2 }, [port2]);
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
      SW.postMessage({ type: "HAS_WORKER_REQUEST" }, [port2]);
    });
  };

  private createDW = async () => {
    await navigator.locks.request(LOCKS.createDW, async () => {
      const reg = await this.getActiveSW();

      const hasDW = await this.doesSWHaveDW(reg);
      if (hasDW) return;

      //TODO Worker url should be a responsability of who instances this class
      const DW = new Worker(new URL("./demo/db.worker.ts", import.meta.url), {
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

    await navigator.serviceWorker.register("/sw.js", { type: "module" });
    const reg = await this.getActiveSW();

    if (!navigator.serviceWorker.controller) {
      window.location.reload();
      return;
    }

    const hasDW = await this.doesSWHaveDW(reg);

    if (!hasDW) {
      await this.createDW();
    }

    reg.postMessage({ type: "TAB_READY" });
  };
}

export { Tab };
