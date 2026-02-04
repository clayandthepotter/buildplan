const { z } = require('zod');

const userProfileSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  bio: z.string().optional(),
});

/**
 * Validates user profile update requests.
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const userProfileValidation = (req, res, next) => {
  const result = userProfileSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json(result.error.errors);
  }
  next();
};

module.exports = { userProfileValidation };