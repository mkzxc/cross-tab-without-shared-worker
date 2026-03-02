import { fetcher } from "../../../core/adapter/fetcher";
import { ENDPOINTS } from "../../endpoints";

async function postMessage() {
  try {
    await fetcher(ENDPOINTS.messages, "POST");
  } catch (error) {
    console.error(error);
    throw error; //TODO
  }
}

export { postMessage };
