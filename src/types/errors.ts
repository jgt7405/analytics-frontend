export interface ApiError {
  type: "network" | "server" | "validation" | "not_found";
  message: string;
  userMessage: string;
  status?: number;
  retryable: boolean;
}

export class BasketballApiError extends Error {
  constructor(
    public apiError: ApiError,
    public originalError?: Error
  ) {
    super(apiError.message);
    this.name = "BasketballApiError";
  }
}
