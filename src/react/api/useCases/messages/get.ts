import { fetcher } from "../../../core/adapter/fetcher";
import { ENDPOINTS } from "../../endpoints";

async function getMessages() {
  try {
    const response = await fetcher(ENDPOINTS.messages, "GET");
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error get messages:", error);
    throw error; //TODO Temp
  }
}

export { getMessages };
