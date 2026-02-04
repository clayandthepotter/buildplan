const { z } = require('zod');
const { Router } = require('express');

const taskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  projectCode: z.string().min(1, "Project code is required"),
});

/**
 * Middleware for validating blocker check request.
 * @param {Router.Request} req - Express request object.
 * @param {Router.Response} res - Express response object.
 * @param {Function} next - Middleware next function.
 */
const blockerValidation = (req, res, next) => {
  const validation = taskSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ success: false, errors: validation.error.errors });
  }
  next();
};

module.exports = { blockerValidation };