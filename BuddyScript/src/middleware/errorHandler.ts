import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      requestId: req.requestId,
      errors: err.issues.map((error: any) => ({
        path: error.path.join("."),
        message: error.message,
      })),
    });
    return;
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      requestId: req.requestId,
    });
    return;
  }

  // Handle mongoose/mongodb errors
  if (err.name === "CastError") {
    res.status(400).json({
      success: false,
      message: "Invalid ID format",
      requestId: req.requestId,
    });
    return;
  }

  if (err.name === "MongoServerError" && (err as any).code === 11000) {
    res.status(409).json({
      success: false,
      message: "Duplicate field value entered",
      requestId: req.requestId,
    });
    return;
  }

  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: err.message || 'Invalid upload payload',
      requestId: req.requestId,
    });
    return;
  }

  // Log error for debugging
  console.error("Error:", err);

  // Default error response
  res.status(500).json({
    success: false,
    message: "Internal server error",
    requestId: req.requestId,
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
