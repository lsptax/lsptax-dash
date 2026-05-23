import { validationResult } from "express-validator";

/**
 * Middleware that runs validationResult(req) and returns 400 with errors if any.
 * Use after express-validator body/param/query checks.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
