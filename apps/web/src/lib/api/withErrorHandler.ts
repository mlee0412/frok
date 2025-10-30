import { NextRequest, NextResponse } from 'next/server';
import { errorHandler, formatErrorMessage } from '../errorHandler';

/**
 * API route handler type
 */
export type ApiRouteHandler = (
  req: NextRequest,
  context?: { params: Record<string, string | string[]> }
) => Promise<NextResponse>;

/**
 * Wrap API route handlers with standardized error handling
 *
 * Usage:
 * ```typescript
 * export const POST = withErrorHandler(async (req) => {
 *   // Your route logic here
 *   return NextResponse.json({ ok: true, data: result });
 * });
 * ```
 */
export function withErrorHandler(handler: ApiRouteHandler): ApiRouteHandler {
  return async (req: NextRequest, context?) => {
    try {
      return await handler(req, context);
    } catch (error: unknown) {
      // Log error with context
      errorHandler.logError({
        message: formatErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined,
        severity: 'high',
        context: {
          route: req.nextUrl.pathname,
          method: req.method,
          url: req.url,
        },
      });

      // Determine status code
      let status = 500;
      let errorMessage = 'Internal server error';

      if (error instanceof Error) {
        // Check for known error types
        if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
          status = 401;
          errorMessage = 'Unauthorized';
        } else if (error.message.includes('forbidden') || error.message.includes('Forbidden')) {
          status = 403;
          errorMessage = 'Forbidden';
        } else if (error.message.includes('not found') || error.message.includes('Not found')) {
          status = 404;
          errorMessage = 'Not found';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          status = 400;
          errorMessage = 'Bad request';
        } else {
          errorMessage = error.message;
        }
      }

      // Return standardized error response
      return NextResponse.json(
        {
          ok: false,
          error: errorMessage,
          ...(process.env["NODE_ENV"] === 'development' && {
            stack: error instanceof Error ? error.stack : undefined,
          }),
        },
        { status }
      );
    }
  };
}
