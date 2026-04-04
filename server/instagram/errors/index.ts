export class InstagramError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'InstagramError';
  }
}

export class InstagramAuthError extends InstagramError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'AUTH_ERROR', 401, originalError);
    this.name = 'InstagramAuthError';
  }
}

export class InstagramChallengeError extends InstagramError {
  constructor(
    message: string,
    public challengeType: 'sms' | 'email' | 'verify',
    public challengeUrl?: string,
    public stepData?: unknown,
    originalError?: unknown
  ) {
    super(message, 'CHALLENGE_REQUIRED', 400, originalError);
    this.name = 'InstagramChallengeError';
  }
}

export class InstagramCheckpointError extends InstagramError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'CHECKPOINT_REQUIRED', 400, originalError);
    this.name = 'InstagramCheckpointError';
  }
}

export class InstagramTwoFactorError extends InstagramError {
  constructor(message: string, public twoFactorInfo?: unknown, originalError?: unknown) {
    super(message, 'TWO_FACTOR_REQUIRED', 400, originalError);
    this.name = 'InstagramTwoFactorError';
  }
}

export class InstagramRateLimitError extends InstagramError {
  constructor(message: string, public retryAfter?: number, originalError?: unknown) {
    super(message, 'RATE_LIMIT', 429, originalError);
    this.name = 'InstagramRateLimitError';
  }
}

export class InstagramNotFoundError extends InstagramError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NOT_FOUND', 404, originalError);
    this.name = 'InstagramNotFoundError';
  }
}

export class InstagramActionSpamError extends InstagramError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'ACTION_SPAM', 429, originalError);
    this.name = 'InstagramActionSpamError';
  }
}

export class InstagramNetworkError extends InstagramError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'NETWORK_ERROR', 0, originalError);
    this.name = 'InstagramNetworkError';
  }
}

export class InstagramSessionError extends InstagramError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'SESSION_ERROR', 401, originalError);
    this.name = 'InstagramSessionError';
  }
}

export class InstagramUploadError extends InstagramError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'UPLOAD_ERROR', 500, originalError);
    this.name = 'InstagramUploadError';
  }
}

export class InstagramProxyError extends InstagramError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'PROXY_ERROR', 502, originalError);
    this.name = 'InstagramProxyError';
  }
}

export function mapIgError(error: unknown): InstagramError {
  if (error instanceof InstagramError) {
    return error;
  }

  const errorObj = error as Record<string, unknown>;
  const message = (errorObj?.message as string) || 'Unknown Instagram error';
  const response = errorObj?.response as Record<string, unknown> | undefined;
  const status = response?.status as number;

  if (message.includes('challenge_required') || message.includes('CHALLENGE')) {
    return new InstagramChallengeError(message, 'verify', undefined, errorObj);
  }

  if (message.includes('checkpoint') || message.includes('CHECKPOINT')) {
    return new InstagramCheckpointError(message, error);
  }

  if (message.includes('two_factor') || message.includes('2FA')) {
    return new InstagramTwoFactorError(message, errorObj?.two_factor_info, error);
  }

  if (message.includes('rate limit') || message.includes('RATE_LIMIT')) {
    return new InstagramRateLimitError(message, errorObj?.retry_after as number, error);
  }

  if (message.includes('login') && (message.includes('bad') || message.includes('invalid'))) {
    return new InstagramAuthError(message, error);
  }

  if (message.includes('not found') || status === 404) {
    return new InstagramNotFoundError(message, error);
  }

  if (message.includes('action spam') || message.includes('ACTION_SPAM')) {
    return new InstagramActionSpamError(message, error);
  }

  if (message.includes('network') || message.includes('ECONNREFUSED')) {
    return new InstagramNetworkError(message, error);
  }

  if (message.includes('upload') || message.includes('UPLOAD')) {
    return new InstagramUploadError(message, error);
  }

  return new InstagramError(message, 'UNKNOWN_ERROR', status, error);
}
