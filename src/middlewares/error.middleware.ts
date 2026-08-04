// Central error handler — last middleware registered in app.ts. Catches
// everything thrown/passed to next(err) (including ApiError from
// utils/apiError.ts) and formats one consistent JSON error response.
//
// TODO:
// - export function errorHandler(err, req, res, next) {...}
