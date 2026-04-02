const LOCKS = {
  createDW: "create-dw-lock",
  customOperation: "custom-operation-lock",
} as const;

const TAB_TO_SW_MESSAGE_TYPES = [
  "HAS_WORKER_REQUEST",
  "WORKER_PORT",
  "TAB_READY",
  "RESEND_PORT",
] as const;

const TAB_TO_DW_MESSAGE_TYPES = ["SW_PORT"] as const;

const SW_TO_TAB_MESSAGE_TYPES = [
  "PORT_READY",
  "CREATE_WORKER",
  "RESEND_PORT",
  "OP_SUCCESS",
  "HAS_WORKER_RESPONSE",
] as const;

const SW_TO_DW_MESSAGE_TYPES = ["PING", "OP"] as const;

const DW_TO_SW_MESSAGE_TYPES = ["PONG", "SUCCESS", "FAILURE"] as const;

export {
  LOCKS,
  TAB_TO_SW_MESSAGE_TYPES,
  SW_TO_TAB_MESSAGE_TYPES,
  TAB_TO_DW_MESSAGE_TYPES,
  SW_TO_DW_MESSAGE_TYPES,
  DW_TO_SW_MESSAGE_TYPES,
};
