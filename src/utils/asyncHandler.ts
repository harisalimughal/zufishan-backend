// Wraps async controller functions so rejected promises are forwarded to
// next(err) automatically, instead of every controller needing its own
// try/catch.
//
// TODO:
// - export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
