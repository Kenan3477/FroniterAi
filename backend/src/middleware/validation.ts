// Request validation middleware using express-validator
import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult } from 'express-validator';

/**
 * Validate request using express-validator rules
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors for response
    const extractedErrors: any[] = [];
    errors.array().map(err => extractedErrors.push({ 
      field: err.type === 'field' ? (err as any).path : 'unknown',
      message: err.msg,
      value: err.type === 'field' ? (err as any).value : undefined
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: extractedErrors
    });
  };
};

/**
 * Custom validation for phone numbers (more flexible than isMobilePhone)
 */
export const isPhoneNumber = (value: string): boolean => {
  // Allow various phone number formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanedValue = value.replace(/[\s\-\(\)\.]/g, '');
  return phoneRegex.test(cleanedValue);
};

/**
 * Custom validation for call IDs
 */
export const isCallId = (value: string): boolean => {
  return /^call_\d+_[a-z0-9]{9}$/.test(value);
};

/**
 * Custom validation for SIP call IDs (Twilio format)
 */
export const isSipCallId = (value: string): boolean => {
  return /^CA[a-f0-9]{32}$/.test(value);
};