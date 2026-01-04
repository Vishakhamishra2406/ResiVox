const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { 
    authenticateToken, 
    findUserByEmail, 
    findUserById, 
    createUser, 
    generateToken, 
    getUserWithoutPassword 
} = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        
        const { role, firstName, lastName, email, unitNumber, adminCode, password } = req.body;

        // Validation
        if (!role || !firstName || !lastName || !email || !password) {
            console.log('Missing required fields:', { role, firstName, lastName, email, password: !!password });
            return res.status(400).json({ 
                message: 'Role, name, email, and password are required' 
            });
        }

        // Role-specific validation
        if (role === 'resident' && !unitNumber) {
            return res.status(400).json({ 
                message: 'Unit number is required for residents' 
            });
        }

        if (role === 'admin' && !adminCode) {
            return res.status(400).json({ 
                message: 'Admin access code is required for admin registration' 
            });
        }

        // Validate admin code (you can change this code as needed)
        if (role === 'admin' && adminCode !== 'RESIVOX_ADMIN_2024') {
            return res.status(401).json({ 
                message: 'Invalid admin access code' 
            });
        }

        // Validate role
        if (!['resident', 'admin'].includes(role)) {
            return res.status(400).json({ 
                message: 'Invalid role. Must be either "resident" or "admin"' 
            });
        }

        // Check if user already exists
        const existingUser = findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ 
                message: 'User with this email already exists' 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Invalid email format' 
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user data
        const userData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: role
        };

        // Add role-specific data
        if (role === 'resident') {
            userData.unitNumber = unitNumber.trim();
        } else if (role === 'admin') {
            userData.unitNumber = 'ADMIN'; // Admin doesn't have a unit number
        }

        // Create user
        const newUser = createUser(userData);

        // Generate token
        const token = generateToken(newUser);

        // Return success response
        res.status(201).json({
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
            token,
            user: getUserWithoutPassword(newUser)
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Internal server error during registration' 
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { role, email, password, rememberMe } = req.body;

        // Validation
        if (!role || !email || !password) {
            return res.status(400).json({ 
                message: 'Role, email and password are required' 
            });
        }

        // Validate role
        if (!['resident', 'admin'].includes(role)) {
            return res.status(400).json({ 
                message: 'Invalid role. Must be either "resident" or "admin"' 
            });
        }

        // Find user
        const user = findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Check if the role matches
        if (user.role !== role) {
            return res.status(401).json({ 
                message: `This account is registered as ${user.role}, not ${role}. Please select the correct role.` 
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                message: 'Invalid credentials' 
            });
        }

        // Generate token (longer expiry if remember me is checked)
        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            unitNumber: user.unitNumber
        };
        
        const tokenOptions = { 
            expiresIn: rememberMe ? '7d' : '24h' 
        };
        
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, tokenOptions);

        // Update last login (in production, save to database)
        user.lastLogin = new Date().toISOString();

        // Return success response
        res.json({
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} login successful`,
            token,
            user: getUserWithoutPassword(user)
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Internal server error during login' 
        });
    }
});

// Verify token
router.post('/verify', authenticateToken, (req, res) => {
    try {
        console.log('Token verification request received');
        console.log('User from token:', req.user);
        
        // Find current user
        const user = findUserById(req.user.id);
        if (!user) {
            console.log('User not found in database:', req.user.id);
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        console.log('Token verification successful for user:', user.email);
        res.json({
            message: 'Token is valid',
            user: getUserWithoutPassword(user)
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({ 
            message: 'Internal server error during token verification' 
        });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
    try {
        const user = findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        res.json({
            user: getUserWithoutPassword(user)
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ 
            message: 'Internal server error while fetching profile' 
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, unitNumber } = req.body;
        
        const user = findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        // Update user data
        if (firstName) user.firstName = firstName.trim();
        if (lastName) user.lastName = lastName.trim();
        if (unitNumber) user.unitNumber = unitNumber.trim();
        user.updatedAt = new Date().toISOString();

        res.json({
            message: 'Profile updated successfully',
            user: getUserWithoutPassword(user)
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            message: 'Internal server error while updating profile' 
        });
    }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                message: 'Current password and new password are required' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                message: 'New password must be at least 6 characters long' 
            });
        }

        const user = findUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                message: 'Current password is incorrect' 
            });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        user.password = hashedNewPassword;
        user.updatedAt = new Date().toISOString();

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ 
            message: 'Internal server error while changing password' 
        });
    }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticateToken, (req, res) => {
    try {
        // In production, you might want to blacklist the token
        // For now, we just acknowledge the logout
        
        const user = findUserById(req.user.id);
        if (user) {
            user.lastLogout = new Date().toISOString();
        }

        res.json({
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            message: 'Internal server error during logout' 
        });
    }
});

module.exports = router;