const { getUserProfile, updateUserProfile } = require('../services/userProfileService');

describe('UserProfile Service', () => {
  it('should fetch the user profile correctly', async () => {
    const userId = '123';
    const userProfile = await getUserProfile(userId);
    expect(userProfile).toBeDefined();
    expect(userProfile).toEqual(expect.any(Object)); // Assuming the actual function returns an object
  });

  it('should update the user profile correctly', async () => {
    const userId = '123';
    const profileData = { name: 'John Doe', email: 'john@example.com' };
    const updatedUserProfile = await updateUserProfile(userId, profileData);
    expect(updatedUserProfile).toBeDefined();
    expect(updatedUserProfile).toEqual(expect.any(Object)); // Assuming the actual function updates and returns an object
  });
});