// Catches requests to unmatched routes — registered right after all routes,
// right before errorHandler in app.ts.
//
// TODO:
// - export function notFound(req, res, next) { next(new ApiError(404, ...)) }
