/**
 * Application-level error that carries an HTTP status code.
 *
 * Shared across modules so services can throw semantically meaningful errors
 * (404 not found, 403 forbidden, 409 conflict, ...) and controllers can
 * translate the `statusCode` into the response without re-deriving it.
 */
export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    // Restore the prototype chain so `instanceof AppError` works after transpilation.
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
