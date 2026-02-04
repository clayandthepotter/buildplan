const express = require('express');
const { checkBlocker } = require('../services/blockerService');
const { blockerValidation } = require('../validation/blockerValidation');

const router = express.Router();

/**
 * POST /api/blocker/identify
 * Identifies blockers for a given task.
 * @param {object} req - Request object containing task details.
 * @param {object} res - Response object for sending back identified blockers.
 */
router.post('/identify', blockerValidation, async (req, res) => {
  try {
    const taskDetails = req.body;
    const blockers = await checkBlocker(taskDetails);
    res.json({ success: true, blockers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error identifying blockers", error: error.message });
  }
});

module.exports = router;