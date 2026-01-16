const Settings = require('../models/Settings');

// Get or initialize settings
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get settings' });
  }
};

// Update settings (Admin only)
const updateSettings = async (req, res) => {
  try {
    const payload = req.body || {};
    const settings = await Settings.findOneAndUpdate({}, { $set: payload }, { new: true, upsert: true });
    res.json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};

module.exports = { getSettings, updateSettings };
