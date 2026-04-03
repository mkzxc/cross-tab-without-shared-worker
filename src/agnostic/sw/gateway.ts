import { LOCKS } from "../const";
import type { DWToSWMessage, SWToDWMessage } from "../types";

class Gateway {
  //TODO Overriding the onmessage callback really doesn't seem like a good solution
  //TODO Should there be a retry instead of just returning 500 and waiting for the next request?
  private sendToDW = (
    message: SWToDWMessage,
    getDWPort: () => MessagePort | null,
  ) => {
    return new Promise((resolve, reject) => {
      const port = getDWPort();
      if (!port) {
        reject(new Error("No worker port"));
        return;
      }

      const timeout = setTimeout(
        () => reject(new Error("Worker response timed out")),
        5000,
      );

      port.onmessage = (e: MessageEvent<DWToSWMessage>) => {
        clearTimeout(timeout);

        switch (e.data.type) {
          case "SUCCESS":
            resolve(e.data);
            break;
          case "FAILURE":
            reject(new Error(e.data.error));
            break;
          default:
            reject(new Error(`Unexpected message event data: ${e.data}`));
        }
      };

      port.postMessage(message);
    });
  };

  handleFetch = async (
    key: string,
    event: FetchEvent,
    sw: ServiceWorkerGlobalScope,
    ensureDWPort: (sw: ServiceWorkerGlobalScope) => Promise<void>,
    getDWPort: () => MessagePort | null,
    notifyAllTabs: (
      sw: ServiceWorkerGlobalScope,
      data: unknown,
    ) => Promise<void>,
  ) => {
    const body = (await event.request.json()) as object;
    try {
      await ensureDWPort(sw);
      return await navigator.locks.request(LOCKS.customOperation, async () => {
        const result = await this.sendToDW(
          {
            type: "OP",
            payload: { data: { ...body }, key },
          },
          getDWPort,
        );
        const response = (result as { result: unknown }).result;
        await notifyAllTabs(sw, {
          result: response,
          key,
        });
        return new Response(JSON.stringify(response));
      });
    } catch (err) {
      const error = err as Error;
      console.error("SW operation error:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500 },
      );
    }
  };
}

export { Gateway };
