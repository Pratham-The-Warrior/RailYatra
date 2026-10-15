/**
 * An error whose status and message are safe to send to the client.
 * Throw it from any route handler; the central error handler responds with
 * {"error": message}. Anything else that reaches the handler with a 5xx
 * status is reported as a generic "Internal server error".
 */
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
    }
}

const badRequest = (message) => new HttpError(400, message);
const notFound = (message) => new HttpError(404, message);

module.exports = { HttpError, badRequest, notFound };
