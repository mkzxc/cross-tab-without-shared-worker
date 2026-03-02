import { useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "../../api/queryKeys";
import { getMessages } from "../../api/useCases/messages/get";

const useGetMessages = () => {
  const data = useSuspenseQuery({
    queryKey: [QUERY_KEYS.messages],
    queryFn: getMessages,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  return {
    messages: data.data.rows as {
      id: number;
      content: string;
      created_at: number;
    }[],
    isLoading: data.isFetching || data.isLoading || data.isRefetching,
  };
};

export { useGetMessages };
