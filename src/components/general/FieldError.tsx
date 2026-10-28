'use client'

import 'client-only';
export type FieldErrorProps = {
  errors?: Record<string, {
    _errors?: string[] | undefined;
  }> & {
    _errors?: string[] | undefined;
  },
  field: string
}

export function FieldError({ errors, field } : FieldErrorProps){
  return <>
    { fieldError(errors, field) ?? null }
  </>
}

// Первая ошибка поля строкой — для пропа `error` у полей Mantine.
export function fieldError(errors: FieldErrorProps['errors'], field: string): string | undefined {
  return errors?.[field]?._errors?.[0];
}
