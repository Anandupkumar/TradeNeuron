class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class DataFetchError extends AppError {
  constructor(message) {
    super(message, 502);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

class FundamentalError extends AppError {
  constructor(message) {
    super(message, 502);
  }
}

module.exports = {
  AppError,
  DataFetchError,
  ValidationError,
  NotFoundError,
  AuthError,
  ConflictError,
  FundamentalError,
};
