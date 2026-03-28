import type { ErrorRequestHandler } from "express";

type ErrorLike = {
    statusCode?: number;
    message?: string;
    name?: string;
    code?: number;
    errors?: Record<string, { message?: string }>;
    keyValue?: Record<string, unknown>;
};

export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const safeErr = err as ErrorLike;
    let statusCode = safeErr.statusCode || 500;
    let message = safeErr.message || "Internal server error";

    // Handle Mongoose validation errors
    if (safeErr.name === "ValidationError" && safeErr.errors) {
        statusCode = 400;
        const messages = Object.values(safeErr.errors)
            .map((item) => item?.message)
            .filter(Boolean) as string[];
        if (messages.length) {
            message = messages.join(", ");
        }
    }

    // Handle Mongoose duplicate key error
    if (safeErr.code === 11000 && safeErr.keyValue) {
        statusCode = 409;
        const field = Object.keys(safeErr.keyValue)[0] || "Field";
        message = `${field} already exists`;
    }

    // Handle Mongoose CastError (invalid ObjectId)
    if (safeErr.name === "CastError") {
        statusCode = 400;
        message = "Invalid ID format";
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};