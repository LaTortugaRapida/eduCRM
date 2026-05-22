const Individual = require('../models/Individual');
const Company = require('../models/Company');
const bcrypt = require('bcryptjs');

exports.getProfile = async (req, res) => {
    try {
        const { id, type } = req.user;
        
        let profile;
        let teamMembers = [];
        
        if (type === 'individual') {
            profile = await Individual.findById(id);
            if (profile && profile.institution_id) {
                teamMembers = await Individual.getTeamMembers(profile.institution_id);
            }
        } else if (type === 'company') {
            profile = await Company.findById(id);
            teamMembers = await Individual.getTeamMembers(id);
        }
        
        if (!profile) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user: profile, teamMembers });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { id, type } = req.user;
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        let user;
        if (type === 'individual') {
            user = await Individual.findById(id);
        } else {
            user = await Company.findById(id);
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        if (type === 'individual') {
            await Individual.updatePassword(id, newPassword);
        } else {
            await Company.updatePassword(id, newPassword);
        }
        
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};