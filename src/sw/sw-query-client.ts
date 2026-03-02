import { QueryClient } from "@tanstack/react-query";

//Share same instance between SW and NetworkProvider
const queryClient = new QueryClient();

function getQueryClient() {
  return queryClient;
}

export { getQueryClient };
