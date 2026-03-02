import { QueryClientProvider } from "@tanstack/react-query";
import type { FC } from "react";
import { getQueryClient } from "../../../sw/sw-query-client";

const queryClient = getQueryClient();

const NetworkProvider: FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export { NetworkProvider };
