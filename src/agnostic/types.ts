type TabToSWMessage =
  | { type: "HAS_WORKER_REQUEST" }
  //TODO Change port to payload
  | { type: "WORKER_PORT"; port: MessagePort }
  | { type: "TAB_READY" }
  | { type: "RESEND_PORT" }
  | { type: "NO_WORKER_HERE" };

/**
 * DW_UPDATED should be changed to an agnostic name that represents that the action
 * desired from the user of the library was successful, and receive a payload not limited to string
 */
type SWToTabMessage =
  | { type: "PORT_READY" }
  | { type: "CREATE_WORKER" }
  | { type: "RESEND_PORT" }
  | { type: "DB_UPDATED"; sql: string }
  //TODO Remember this is a refactored migration from type HasWorkerResponse
  | { type: "HAS_WORKER_RESPONSE"; payload: boolean };

export type { TabToSWMessage, SWToTabMessage };
