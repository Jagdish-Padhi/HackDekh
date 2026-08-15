import type { ErrorRequestHandler } from "express";

type ErrorLike = {
    statusCode?: number;
    message?: string;
    name?: string;
};

export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const safeErr = err as ErrorLike;
    let statusCode = safeErr.statusCode || 500;
    let message = safeErr.message || "Internal server error";

    // Handle DynamoDB conditional check failure (duplicate / conflict)
    if (safeErr.name === "ConditionalCheckFailedException") {
        statusCode = 409;
        message = "Item already exists";
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};