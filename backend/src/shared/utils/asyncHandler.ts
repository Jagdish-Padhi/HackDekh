import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler<Req, Res> = (
  req: Req,
  res: Res,
  next: NextFunction
) => Promise<unknown>;

const asyncHandler = <Req extends Request = Request, Res extends Response = Response>(
  requestHandler: AsyncRequestHandler<Req, Res>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req as Req, res as Res, next)).catch(next);
  };
};

export { asyncHandler };