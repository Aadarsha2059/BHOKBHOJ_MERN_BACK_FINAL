// Custom error class for handling application errors
class AppError extends Error {
  constructor(
    statusCode,
    message,
    errors = [],
    status = 'error',
    isOperational = true
  ) {
    super(message);

    // For proper prototype chain in javascript inheretence
    Object.setPrototypeOf(this, AppError.prototype);

    this.statusCode = statusCode;
    this.status = status;
    this.errors = errors;
    this.isOperational = isOperational;

    // Maintains proper stack trace 
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(isDevelopment = false) {
    const json = {
      success: false,
      status: this.status,
      message: this.message,
      statusCode: this.statusCode
    };

    if (this.errors && this.errors.length > 0) {
      json.errors = this.errors;
    }

    if (isDevelopment && this.stack) {
      json.stack = this.stack;
    }

    return json;
  }

  static badRequest(message, errors = []) {
    return new AppError(400, message, errors);
  }

  static unauthorized(message) {
    return new AppError(401, message);
  }

  static forbidden(message) {
    return new AppError(403, message);
  }

  static notFound(message) {
    return new AppError(404, message);
  }

  static conflict(message) {
    return new AppError(409, message);
  }

  static validation(message, errors = []) {
    return new AppError(422, message, errors);
  }

  static internal(message) {
    return new AppError(500, message, [], 'error', false);
  }
}

module.exports = AppError;
