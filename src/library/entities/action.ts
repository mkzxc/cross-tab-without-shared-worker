interface Action<T, K, Z> {
  key: T;
  fetchFn: (payload: K) => Z;
  onSuccess?: (data: Z) => void | Promise<void>;
  onError?: (error: Error) => void;
}

export type { Action };
