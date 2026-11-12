export interface ApiError {
  type: "network" | "server" | "validation" | "not_found";
  message: string;
  userMessage: string;
  status?: number;
  retryable: boolean;
}

export class BasketballApiError extends Error {
  /** HTTP status, when the failure had one. QueryProvider's retry rule reads it. */
  public status?: number;

  constructor(
    public apiError: ApiError,
    public originalError?: Error
  ) {
    super(apiError.message);
    this.name = "BasketballApiError";
    this.status = apiError.status;
  }
}
