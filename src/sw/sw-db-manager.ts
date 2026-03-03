/// <reference lib="webworker" />

import { ensurePortIsReady, getWorkerPort } from "./sw-dw-manager";
import { notifyAllTabs } from "./sw-tabs-manager";
import type { DBExecBody, DWToSWMessage, SWToDWMessage } from "./sw-types";

//TODO Overriding the onmessage callback really doesn't seem like a good solution
//TODO Should there be a retry instead of just returning 500 and waiting for the next request?
async function sendToWorker(message: SWToDWMessage) {
  return new Promise((resolve, reject) => {
    const workerPort = getWorkerPort();
    if (!workerPort) return reject(new Error("No worker port"));
    const timeout = setTimeout(
      () => reject(new Error("Worker response timed out")),
      5000,
    );
    workerPort.onmessage = (e: MessageEvent<DWToSWMessage>) => {
      clearTimeout(timeout);

      switch (e.data.type) {
        case "SUCCESS":
          resolve(e.data);
          return;
        case "FAILURE":
          reject(new Error(e.data.error));
          return;
        default:
          reject(new Error(`Unexpected Message Event Data: ${e.data}`));
      }
    };
    workerPort.postMessage(message);
  });
}

async function handleExec(event: FetchEvent, sw: ServiceWorkerGlobalScope) {
  const body = (await event.request.json()) as DBExecBody;

  try {
    await ensurePortIsReady(sw);
    return await navigator.locks.request("db-lock", async () => {
      const result = await sendToWorker({ type: "EXEC", ...body });
      await notifyAllTabs(sw, { sql: body.sql });
      return new Response(JSON.stringify(result));
    });
  } catch (err) {
    const error = err as Error;
    console.error("SW exec error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 },
    );
  }
}

async function handleQuery(event: FetchEvent, sw: ServiceWorkerGlobalScope) {
  const body = (await event.request.json()) as DBExecBody;
  try {
    await ensurePortIsReady(sw);
    return await navigator.locks.request("db-lock", async () => {
      const result = await sendToWorker({ type: "QUERY", ...body });
      return new Response(JSON.stringify(result));
    });
  } catch (err) {
    const error = err as Error;
    console.error("SW query error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 },
    );
  }
}

export { handleExec, handleQuery };
