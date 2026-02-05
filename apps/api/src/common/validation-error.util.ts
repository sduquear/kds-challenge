import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export interface ValidationErrorItem {
  field: string;
  message: string;
}

export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationErrorItem[] {
  const result: ValidationErrorItem[] = [];
  for (const err of errors) {
    const path = parentPath ? `${parentPath}.${err.property}` : err.property;
    if (err.constraints) {
      const message = Object.values(err.constraints).join('; ');
      result.push({ field: path, message });
    }
    if (err.children?.length) {
      result.push(...formatValidationErrors(err.children, path));
    }
  }
  return result;
}

export function validationExceptionFactory(
  validationErrors: ValidationError[] = [],
): BadRequestException {
  const errors = formatValidationErrors(validationErrors);
  const message =
    errors.length === 0
      ? 'Validation failed'
      : `Validation failed: ${errors.map((e) => `${e.field} — ${e.message}`).join('; ')}`;
  return new BadRequestException({
    message,
    error: 'Bad Request',
    errors,
  });
}
