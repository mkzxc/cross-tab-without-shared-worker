import type { HasWorkerResponse, SWToTabMessage } from "../sw/sw-types";
import { LOCKS } from "./const";

class Tab {
  //This can't be shared across instances since only one tab must have this set different to null
  #currentDW: Worker | null = null;

  constructor() {}

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

  /**
   * Send SW port to DW
   * Send DW port to SW
   * Resolve the promise upon receiving PORT_READY from the SW
   */
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
      reg.postMessage({ type: "WORKER_PORT", port: port2 }, [port2]);
    });
  };

  private doesSWHaveDW = async (SW: ServiceWorker) => {
    return await new Promise<boolean>((resolve) => {
      const { port1, port2 } = new MessageChannel();
      port1.onmessage = (e: MessageEvent<HasWorkerResponse>) =>
        resolve(e.data.hasWorker);
      SW.postMessage({ type: "HAS_WORKER_REQUEST" }, [port2]);
    });
  };

  private createDW = async () => {
    await navigator.locks.request(LOCKS.workerCreate, async () => {
      const reg = await this.getActiveSW();

      const hasDW = await this.doesSWHaveDW(reg);
      if (hasDW) return;

      const DW = new Worker(new URL("./db.worker.ts", import.meta.url), {
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

  private setup = async () => {
    navigator.serviceWorker.addEventListener(
      "message",
      async (event: MessageEvent<SWToTabMessage>) => {
        console.log("SW message:", event.data);

        /**
         * This should be changed to an agnostic name that represents that the action
         * desired from the user of the library was successful
         */
        if (event.data.type === "DB_UPDATED") {
          //   queryClient.invalidateQueries({
          //     queryKey: [QUERY_KEYS.messages],
          //   });
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
