const express = require('express');
const { getUserProfile, updateUserProfile } = require('../services/userProfileService');
const { userProfileValidation } = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @route GET /api/user/profile
 * @desc Get user profile information
 * @access Private
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id; // Assuming req.user is populated by an auth middleware
    const userProfile = await getUserProfile(userId);
    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/user/profile
 * @desc Update user profile information
 * @access Private
 */
router.put('/profile', userProfileValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedUserProfile = await updateUserProfile(userId, req.body);
    res.json(updatedUserProfile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;