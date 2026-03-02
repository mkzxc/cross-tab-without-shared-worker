import { useMutation } from "@tanstack/react-query";
import { postMessage } from "../../api/useCases/messages/post";

const usePostMessages = () => {
  return useMutation({
    mutationFn: postMessage,
  });
};

export { usePostMessages };
