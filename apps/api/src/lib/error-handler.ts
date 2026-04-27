import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Global Fastify error handler.
 * - In production: returns structured JSON without leaking internals.
 * - In development: includes the error message for easier debugging.
 */
export function globalErrorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
) {
    const statusCode = error.statusCode ?? 500;
    const isProd = process.env.NODE_ENV === 'production';

    // Always log the full error server-side
    request.log.error(
        { err: error, reqId: request.id, url: request.url, method: request.method },
        `Request error: ${error.message}`
    );

    // Validation errors (from Fastify schema validation)
    if (error.validation) {
        return reply.status(400).send({
            error: 'Validation Error',
            message: error.message,
            code: 'VALIDATION_ERROR',
        });
    }

    // Known application errors
    if (statusCode < 500) {
        return reply.status(statusCode).send({
            error: error.message || 'Bad Request',
            code: error.code || 'CLIENT_ERROR',
        });
    }

    // 5xx — hide details in production
    return reply.status(statusCode).send({
        error: isProd ? 'Internal Server Error' : error.message,
        code: error.code || 'INTERNAL_ERROR',
        ...(isProd ? {} : { stack: error.stack }),
    });
}
