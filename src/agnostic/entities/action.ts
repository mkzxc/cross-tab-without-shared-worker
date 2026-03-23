interface Action<T, K, Z = never> {
  key: T;
  payload?: K;
  onSuccess?: (data: Z) => void;
  onError?: (error: Error) => void;
}

export type { Action };
