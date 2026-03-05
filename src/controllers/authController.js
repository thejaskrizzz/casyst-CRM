const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokens');

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Email and password are required' });

        const user = await User.findOne({ email }).select('+password +refresh_tokens');
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        if (user.status === 'inactive') return res.status(403).json({ success: false, message: 'Account is inactive. Contact admin.' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refresh_tokens.push(refreshToken);
        if (user.refresh_tokens.length > 5) user.refresh_tokens.shift(); // Keep max 5
        await user.save({ validateBeforeSave: false });

        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                accessToken,
                refreshToken,
            },
        });
    } catch (err) { next(err); }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

        let decoded;
        try { decoded = verifyRefreshToken(refreshToken); }
        catch { return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' }); }

        const user = await User.findById(decoded.id).select('+refresh_tokens');
        if (!user || !user.refresh_tokens.includes(refreshToken))
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });

        const newAccessToken = generateAccessToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id);

        user.refresh_tokens = user.refresh_tokens.filter(t => t !== refreshToken);
        user.refresh_tokens.push(newRefreshToken);
        await user.save({ validateBeforeSave: false });

        res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
    } catch (err) { next(err); }
};

// @desc    Logout
// @route   POST /api/auth/logout
exports.logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken && req.user) {
            const user = await User.findById(req.user._id).select('+refresh_tokens');
            if (user) {
                user.refresh_tokens = user.refresh_tokens.filter(t => t !== refreshToken);
                await user.save({ validateBeforeSave: false });
            }
        }
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) { next(err); }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    res.json({ success: true, data: req.user });
};
