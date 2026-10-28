import { ZodError } from 'zod';

export type FieldErrors<T> = Partial<Record<keyof T, string>> & Record<string, string | undefined>;

export const formatZodError = (error: ZodError): Record<string, string> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return error.issues.reduce<Record<string, string>>((acc: any, issue: any) => {
    const key = issue.path.join('.'); 
    
    if (!acc[key]) {
      acc[key] = issue.message;
    }
    
    return acc;
  }, {});
};