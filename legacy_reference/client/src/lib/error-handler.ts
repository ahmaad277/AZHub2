/**
 * Comprehensive error handler with Arabic translations
 * Handles different error types and provides localized error messages
 */

export interface ApiError {
  status?: number;
  message: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Parse error response from API
 */
export function parseApiError(error: any): ApiError {
  // Handle network errors
  if (error?.name === "AbortError" || error?.message?.includes("timeout")) {
    return {
      status: 408,
      code: "TIMEOUT",
      message: "Request timeout",
    };
  }

  // Handle fetch network errors
  if (error?.message?.includes("Failed to fetch")) {
    return {
      status: 0,
      code: "NETWORK_ERROR",
      message: "Network connection failed",
    };
  }

  // Handle JSON errors
  if (error?.message?.includes("JSON")) {
    return {
      status: 500,
      code: "INVALID_JSON",
      message: "Server returned invalid response",
    };
  }

  // Handle response errors with status code
  if (typeof error?.message === "string" && error.message.includes(":")) {
    const match = error.message.match(/(\d+):\s*(.*)/);
    if (match) {
      const [, statusStr, message] = match;
      return {
        status: parseInt(statusStr),
        message: message.trim(),
      };
    }
  }

  // Generic error
  return {
    status: error?.status || 500,
    message: error?.message || "An unknown error occurred",
    code: error?.code,
  };
}

/**
 * Get localized error message based on error type and status
 */
export function getLocalizedErrorMessage(
  error: any,
  t: (key: string) => string,
): string {
  const parsedError = parseApiError(error);

  // Map specific error codes and status codes to translation keys
  const errorMap: Record<string | number, string> = {
    // Network errors
    "NETWORK_ERROR": "errors.networkError",
    0: "errors.networkError",
    "TIMEOUT": "errors.timeout",
    408: "errors.timeout",

    // Client errors
    400: "errors.badRequest",
    401: "errors.unauthorized",
    403: "errors.forbidden",
    404: "errors.notFound",
    409: "errors.conflict",
    422: "errors.validationError",

    // Server errors
    500: "errors.serverError",
    502: "errors.badGateway",
    503: "errors.serviceUnavailable",
    504: "errors.gatewayTimeout",

    // Specific application errors
    "INVALID_JSON": "errors.invalidResponse",
  };

  // Try to get message from error map
  const translationKey = errorMap[parsedError.code || parsedError.status || ""];
  if (translationKey) {
    return t(translationKey);
  }

  // Fallback to parsed message or generic error
  return (
    parsedError.message ||
    t("errors.unknownError") ||
    "An unknown error occurred"
  );
}

/**
 * Get error title for notifications
 */
export function getErrorTitle(error: any, t: (key: string) => string): string {
  const parsedError = parseApiError(error);

  if (parsedError.status && parsedError.status >= 500) {
    return t("errors.serverErrorTitle") || "Server Error";
  }

  if (parsedError.status && parsedError.status >= 400) {
    return t("errors.requestErrorTitle") || "Request Error";
  }

  return t("dialog.error") || "Error";
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const parsedError = parseApiError(error);

  // Retryable status codes
  const retryableStatuses = [408, 429, 500, 502, 503, 504];

  // Don't retry client errors
  if (parsedError.status && parsedError.status >= 400 && parsedError.status < 500) {
    return false;
  }

  // Don't retry specific errors
  if (parsedError.code === "INVALID_JSON") {
    return false;
  }

  return true;
}

/**
 * Format error details for display
 */
export function formatErrorDetails(error: any): string {
  const parsedError = parseApiError(error);

  let details = "";

  if (parsedError.status) {
    details += `Status: ${parsedError.status}`;
  }

  if (parsedError.code) {
    if (details) details += " | ";
    details += `Code: ${parsedError.code}`;
  }

  if (parsedError.details) {
    if (details) details += " | ";
    details += JSON.stringify(parsedError.details);
  }

  return details;
}

/**
 * Create retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Handle mutation error
 */
export function handleMutationError(
  error: any,
  t: (key: string) => string,
  defaultMessage?: string,
): {
  title: string;
  description: string;
  variant: "destructive" | "default";
} {
  return {
    title: getErrorTitle(error, t),
    description: defaultMessage || getLocalizedErrorMessage(error, t),
    variant: "destructive",
  };
}

/**
 * Validate response data
 */
export function validateResponseData<T>(
  data: unknown,
  validator?: (data: any) => data is T,
): T {
  if (validator && !validator(data)) {
    throw new Error("Invalid response format from server");
  }

  return data as T;
}
