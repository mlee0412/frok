import { useForm, UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Hook for creating validated forms with Zod schemas
 *
 * @example
 * const schema = z.object({
 *   email: z.string().email('Invalid email'),
 *   password: z.string().min(8, 'Password must be at least 8 characters'),
 * });
 *
 * const form = useValidatedForm(schema, {
 *   defaultValues: { email: '', password: '' }
 * });
 *
 * const onSubmit = form.handleSubmit((data) => {
 *   console.log(data); // Type-safe validated data
 * });
 */
export function useValidatedForm<T extends z.ZodType<any, any>>(
  schema: T,
  options?: Omit<UseFormProps<z.infer<T>>, 'resolver'>
) {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    ...options,
  });
}

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  url: z.string().url('Please enter a valid URL'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'),
  required: (fieldName: string) => z.string().min(1, `${fieldName} is required`),
};
