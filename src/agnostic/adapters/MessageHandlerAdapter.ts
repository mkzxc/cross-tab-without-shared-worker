/**
 * Shapes user data handler so that it fits into library architecture
 */
class MessageHandlerAdapter<T> {
  #initializerDW: () => void;
  #port: MessagePort | null = null;

  /**
   * @param handler This callback should handle all the possible sent message that are differentiated by the key
   */
  constructor(handler: (payload: T) => unknown) {
    this.#initializerDW = () => {
      self.postMessage({ type: "READY" });
      self.addEventListener("message", (event) => {
        if (event.data.type === "SW_PORT") {
          this.#port = event.data.port as MessagePort;

          this.#port.onmessage = (e) => {
            try {
              if (!this.#port) {
                //Should never happen
                throw new Error("DW: MessagePort not available");
              }
              if (e.data.type === "PING") {
                this.#port.postMessage({ type: "PONG" });
                return;
              }
              //TODO Support async handler cb?
              const result = handler(e.data.payload);
              this.#port.postMessage({
                type: "SUCCESS",
                result: result || null,
              });
            } catch (error) {
              if (!this.#port) {
                //Should never happen
                throw new Error("DW: MessagePort not available");
              }
              this.#port.postMessage({ type: "FAILURE", error });
            }
          };
        }
      });
    };
  }

  getInitializerDW = () => {
    return this.#initializerDW;
  };
}

export { MessageHandlerAdapter };
