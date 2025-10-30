/**
 * Request validation middleware using Zod schemas
 * Provides type-safe validation for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { formatErrorMessage } from '@/lib/errorHandler';

type ValidationTarget = 'body' | 'query' | 'params';

type ValidationConfig<TBody, TQuery, TParams> = {
  body?: z.ZodSchema<TBody>;
  query?: z.ZodSchema<TQuery>;
  params?: z.ZodSchema<TParams>;
};

type ValidatedData<TBody, TQuery, TParams> = {
  body: TBody;
  query: TQuery;
  params: TParams;
};

type ValidationResult<TBody, TQuery, TParams> =
  | { ok: true; data: ValidatedData<TBody, TQuery, TParams> }
  | { ok: false; response: NextResponse };

/**
 * Validates request data against Zod schemas
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const validation = await validate(req, {
 *     body: createThreadSchema,
 *   });
 *
 *   if (!validation.ok) return validation.response;
 *
 *   const { body } = validation.data;
 *   // body is now type-safe and validated
 * }
 * ```
 */
export async function validate<TBody = unknown, TQuery = unknown, TParams = unknown>(
  req: NextRequest,
  config: ValidationConfig<TBody, TQuery, TParams>,
  context?: { params?: Record<string, string> }
): Promise<ValidationResult<TBody, TQuery, TParams>> {
  try {
    const results: Partial<ValidatedData<TBody, TQuery, TParams>> = {
      body: undefined as TBody,
      query: undefined as TQuery,
      params: undefined as TParams,
    };

    // Validate request body
    if (config.body) {
      try {
        const contentType = req.headers.get('content-type') || '';

        let bodyData: unknown;
        if (contentType.includes('application/json')) {
          bodyData = await req.json();
        } else if (contentType.includes('text/csv')) {
          // For CSV uploads, pass raw text
          bodyData = await req.text();
        } else {
          // Try to parse as JSON by default
          try {
            bodyData = await req.json();
          } catch {
            bodyData = {};
          }
        }

        results.body = config.body.parse(bodyData);
      } catch (error) {
        if (error instanceof ZodError) {
          return {
            ok: false,
            response: NextResponse.json(
              {
                ok: false,
                error: 'Validation failed',
                details: error.errors.map((e) => ({
                  field: e.path.join('.'),
                  message: e.message,
                  code: e.code,
                })),
              },
              { status: 400 }
            ),
          };
        }
        throw error;
      }
    }

    // Validate query parameters
    if (config.query) {
      try {
        const queryParams = Object.fromEntries(req.nextUrl.searchParams.entries());
        results.query = config.query.parse(queryParams);
      } catch (error) {
        if (error instanceof ZodError) {
          return {
            ok: false,
            response: NextResponse.json(
              {
                ok: false,
                error: 'Invalid query parameters',
                details: error.errors.map((e) => ({
                  field: e.path.join('.'),
                  message: e.message,
                  code: e.code,
                })),
              },
              { status: 400 }
            ),
          };
        }
        throw error;
      }
    }

    // Validate route parameters
    if (config.params && context?.params) {
      try {
        results.params = config.params.parse(context.params);
      } catch (error) {
        if (error instanceof ZodError) {
          return {
            ok: false,
            response: NextResponse.json(
              {
                ok: false,
                error: 'Invalid route parameters',
                details: error.errors.map((e) => ({
                  field: e.path.join('.'),
                  message: e.message,
                  code: e.code,
                })),
              },
              { status: 400 }
            ),
          };
        }
        throw error;
      }
    }

    return {
      ok: true,
      data: results as ValidatedData<TBody, TQuery, TParams>,
    };
  } catch (error: unknown) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'Request validation error',
          message: formatErrorMessage(error),
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Convenience function for validating only request body
 *
 * @example
 * ```typescript
 * const validation = await validateBody(req, createThreadSchema);
 * if (!validation.ok) return validation.response;
 * const { title, agentId } = validation.data;
 * ```
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const result = await validate(req, { body: schema });
  if (!result.ok) return result;
  return { ok: true, data: result.data.body };
}

/**
 * Convenience function for validating only query parameters
 *
 * @example
 * ```typescript
 * const validation = await validateQuery(req, paginationSchema);
 * if (!validation.ok) return validation.response;
 * const { limit, offset } = validation.data;
 * ```
 */
export async function validateQuery<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const result = await validate(req, { query: schema });
  if (!result.ok) return result;
  return { ok: true, data: result.data.query };
}

/**
 * Convenience function for validating only route parameters
 *
 * @example
 * ```typescript
 * const validation = await validateParams(context, threadIdParamSchema);
 * if (!validation.ok) return validation.response;
 * const { threadId } = validation.data;
 * ```
 */
export async function validateParams<T>(
  context: { params: Record<string, string> },
  schema: z.ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const data = schema.parse(context.params);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            ok: false,
            error: 'Invalid route parameters',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'Parameter validation error',
          message: formatErrorMessage(error),
        },
        { status: 400 }
      ),
    };
  }
}
