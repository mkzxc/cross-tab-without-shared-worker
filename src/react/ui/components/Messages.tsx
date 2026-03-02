import type { FC } from "react";
import { useGetMessages } from "../presenters/useGetMessages";
import { usePostMessages } from "../presenters/usePostMessages";

const Messages: FC = () => {
  const { messages } = useGetMessages();
  const postMessages = usePostMessages();

  return (
    <div>
      <ul>
        {messages.map((value) => {
          return (
            <li key={value.id}>
              {value.content} {value.created_at}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => postMessages.mutate()}
        disabled={postMessages.isPending}
      >
        POST
      </button>
    </div>
  );
};

export { Messages };
