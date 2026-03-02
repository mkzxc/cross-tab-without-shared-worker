import { setupButtons } from "./buttons";
import { setupReact } from "./react";
import { QUERY_KEYS } from "./react/api/queryKeys";
import { getQueryClient } from "./sw/sw-query-client";
import type { HasWorkerResponse, SWToTabMessage } from "./sw/sw-types";

//Keep reference to active dedicated worker
let currentDW: Worker | null = null;

const queryClient = getQueryClient();

async function getActiveSW() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) {
      throw new Error("SW not active yet");
    }
    return reg.active;
  } catch (error) {
    console.error(error);
    window.location.reload();
    throw error; //This won't ever happen
  }
}

async function sendPortToServiceWorker(worker: Worker) {
  const reg = await getActiveSW();
  const { port1, port2 } = new MessageChannel();
  worker.postMessage({ type: "SW_PORT", port: port1 }, [port1]);

  await new Promise<void>((resolve) => {
    const listener = (e: MessageEvent<SWToTabMessage>) => {
      if (e.data.type === "PORT_READY") {
        navigator.serviceWorker.removeEventListener("message", listener);
        resolve();
      }
    };
    navigator.serviceWorker.addEventListener("message", listener);
    reg.postMessage({ type: "WORKER_PORT", port: port2 }, [port2]);
  });
}

async function createDW() {
  await navigator.locks.request("worker-create-lock", async () => {
    const reg = await getActiveSW();

    const alreadyHasWorker = await new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => resolve(e.data.hasWorker);
      reg.postMessage({ type: "HAS_WORKER" }, [channel.port2]);
    });

    if (alreadyHasWorker) {
      return;
    }

    const worker = new Worker(new URL("./db.worker.ts", import.meta.url), {
      type: "module",
    });

    await new Promise<void>((resolve) => {
      worker.addEventListener("message", (e) => {
        if (e.data.type === "READY") resolve();
      });
    });

    currentDW = worker;
    await sendPortToServiceWorker(worker);
  });
}

async function setup() {
  navigator.serviceWorker.addEventListener(
    "message",
    async (event: MessageEvent<SWToTabMessage>) => {
      console.log("SW message:", event.data);

      if (event.data.type === "DB_UPDATED") {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.messages],
        });
      }

      if (event.data.type === "CREATE_WORKER") {
        await createDW();
      }

      if (event.data.type === "RESEND_PORT") {
        if (currentDW) {
          await sendPortToServiceWorker(currentDW);
        } else {
          await createDW();
        }
      }
    },
  );

  await navigator.serviceWorker.register("/sw.js", { type: "module" });
  const reg = await getActiveSW();

  if (!navigator.serviceWorker.controller) {
    window.location.reload();
    return;
  }

  const hasWorker = await new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (e: MessageEvent<HasWorkerResponse>) =>
      resolve(e.data.hasWorker);
    reg.postMessage({ type: "HAS_WORKER" }, [channel.port2]);
  });

  if (!hasWorker) {
    await createDW();
  }

  reg.postMessage({ type: "TAB_READY" });
}

function init() {
  setup().then(() => {
    setupButtons();
    setupReact();
  });
}

init();
