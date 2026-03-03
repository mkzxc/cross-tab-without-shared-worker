/// <reference lib="webworker" />

import { addTab } from "./sw-tabs-manager";
import { getWorkerPort, setWorkerPort, resetWorkerPort } from "./sw-dw-manager";
import { handleExec, handleQuery } from "./sw-db-manager";
import type { TabToSWMessage, DWToSWMessage } from "./sw-types";

const sw = self as unknown as ServiceWorkerGlobalScope;

//We don't want to wait for the existing SW to not have any clients
sw.addEventListener("install", () => {
  sw.skipWaiting();
});

//After installing we want to take control of every client
sw.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(sw.clients.claim());
});

async function isPortAlive(): Promise<boolean> {
  const workerPort = getWorkerPort();
  if (!workerPort) return false;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resetWorkerPort();
      resolve(false);
    }, 300);

    workerPort.onmessage = (e: MessageEvent<DWToSWMessage>) => {
      if (e.data.type === "PONG") {
        clearTimeout(timeout);
        resolve(true);
      }
    };

    workerPort.postMessage({ type: "PING" });
  });
}

sw.addEventListener("message", async (event: ExtendableMessageEvent) => {
  const data = event.data as TabToSWMessage;

  if (data.type === "TAB_READY") {
    const source = event.source as WindowClient;
    addTab(source.id);
  }

  if (data.type === "HAS_WORKER") {
    const alive = await isPortAlive();
    event.ports[0].postMessage({ hasWorker: alive });
  }

  if (data.type === "WORKER_PORT") {
    const source = event.source as WindowClient;
    setWorkerPort(data.port, source.id);
    source.postMessage({ type: "PORT_READY" });
  }
});

sw.addEventListener("fetch", (event: FetchEvent) => {
  const url = event.request.url;
  if (url.includes("/__db__/exec")) {
    event.respondWith(handleExec(event, sw));
  } else if (url.includes("/__db__/query")) {
    event.respondWith(handleQuery(event, sw));
  }
});
