class ApiError extends Error {
    statusCode: Number;
    success: boolean;
    data: null;
    errors: never[];
    constructor(
        statusCode: Number,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode,
            this.message = message,
            this.data = null;
        this.success = false,
            this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };