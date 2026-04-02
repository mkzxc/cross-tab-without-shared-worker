//TODO This should be handled differently: https://stackoverflow.com/questions/56356655/structuring-a-typescript-project-with-workers
/// <reference lib="webworker" />

import { TAB_TO_SW_MESSAGE_TYPES } from "../const";
import type { DWToSWMessage, SWToTabMessage, TabToSWMessage } from "../types";
import { Gateway } from "./gateway";
import { DWService } from "./services/DWService";
import { TabService } from "./services/TabsService";

class SW {
  #sw;
  #tabsService;
  #DWService;
  #Gateway;

  constructor() {
    this.#sw = self as unknown as ServiceWorkerGlobalScope;
    this.#tabsService = new TabService();
    this.#DWService = new DWService();
    this.#Gateway = new Gateway();
  }

  private isPortAlive() {
    const portDW = this.#DWService.getPort();
    if (!portDW) return false;

    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        this.#DWService.resetPortAndOwner();
        resolve(false);
      }, 300);

      portDW.onmessage = (e: MessageEvent<DWToSWMessage>) => {
        if (e.data.type === "PONG") {
          clearTimeout(timeout);
          resolve(true);
        }
      };

      portDW.postMessage({ type: "PING" });
    });
  }

  private isTabMessage = (data: unknown): data is TabToSWMessage => {
    return Boolean(
      typeof data === "object" &&
      data &&
      "type" in data &&
      typeof data.type === "string" &&
      TAB_TO_SW_MESSAGE_TYPES.includes(
        data.type as (typeof TAB_TO_SW_MESSAGE_TYPES)[number],
      ),
    );
  };

  private sendMessageToTab = (
    wire: MessagePort | WindowClient,
    message: SWToTabMessage,
  ) => {
    wire.postMessage(message);
  };

  initializeSW = () => {
    //We don't want to wait for the existing SW to not have any clients
    this.#sw.addEventListener("install", () => {
      this.#sw.skipWaiting();
    });

    this.#sw.addEventListener("activate", (event) => {
      event.waitUntil(this.#sw.clients.claim());
    });

    this.#sw.addEventListener("message", async (event) => {
      if (!this.isTabMessage(event.data)) {
        console.error(
          `Unsupported message, SW expects TabToSWMessage`,
          event.data,
        );
        return;
      }

      if (event.data.type === "TAB_READY") {
        const source = event.source as WindowClient;
        this.#tabsService.addTab(source.id);
      }

      if (event.data.type === "HAS_WORKER_REQUEST") {
        const isAlive = await this.isPortAlive();
        this.sendMessageToTab(event.ports[0], {
          type: "HAS_WORKER_RESPONSE",
          payload: isAlive,
        });
      }

      if (event.data.type === "WORKER_PORT") {
        const source = event.source as WindowClient;
        this.#DWService.setPortAndOwner(event.data.payload, source.id);
        this.sendMessageToTab(source, { type: "PORT_READY" });
      }
    });

    this.#sw.addEventListener("fetch", (event) => {
      //Only request with X-Key header will be custom handled
      const keyHeader = event.request.headers.get("X-Key");
      if (typeof keyHeader === "string" && keyHeader.length > 0) {
        event.respondWith(
          this.#Gateway.handleFetch(
            keyHeader,
            event,
            this.#sw,
            (sw: ServiceWorkerGlobalScope) => {
              return this.#DWService.ensurePortIsReady(
                sw,
                this.#tabsService.getReadyTab,
              );
            },
            this.#DWService.getPort,
            this.#tabsService.notifyAllTabs,
          ),
        );
      }
    });
  };
}

export { SW };
