const asyncHandler = (reqestHandler) => (req, res, next) => {
  Promise.resolve(reqestHandler(req, res, next)).catch((err) => next(err));
};

export { asyncHandler };