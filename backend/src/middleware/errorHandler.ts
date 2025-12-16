import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
  error.isOperational = true;
  return error;
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = createError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = error;

  // Handle different types of errors
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    }
  });
};