import { StrictMode, type FC } from "react";
import { NetworkProvider } from "./core/frameworks/network";
import { Messages } from "./ui/components/Messages";

const App: FC = () => {
  return (
    <StrictMode>
      <NetworkProvider>
        <h1>React</h1>
        <Messages />
      </NetworkProvider>
    </StrictMode>
  );
};

export { App };
