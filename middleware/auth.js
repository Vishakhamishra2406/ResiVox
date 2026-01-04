const jwt = require('jsonwebtoken');

// In-memory user storage (replace with database in production)
const users = [
    {
        id: 1,
        email: 'admin@resivox.com',
        password: '$2b$10$8K1p/a0dclxKxYIyIL4lKe4kNxZGk.cjeyJw6/Fei9.eMrFXvO9EO', // admin123
        firstName: 'Admin',
        lastName: 'User',
        unitNumber: 'ADMIN',
        role: 'admin',
        createdAt: new Date().toISOString()
    }
];

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('Auth middleware - Token received:', !!token);

    if (!token) {
        console.log('Auth middleware - No token provided');
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Auth middleware - Token verification failed:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        console.log('Auth middleware - Token verified for user:', user.email);
        req.user = user;
        next();
    });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Helper function to find user by email
const findUserByEmail = (email) => {
    return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

// Helper function to find user by id
const findUserById = (id) => {
    return users.find(user => user.id === id);
};

// Helper function to create new user
const createUser = (userData) => {
    const newUser = {
        id: users.length + 1,
        ...userData,
        role: userData.role || 'resident', // Default to resident if no role specified
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    return newUser;
};

// Helper function to generate JWT token
const generateToken = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        unitNumber: user.unitNumber
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, { 
        expiresIn: '24h' 
    });
};

// Helper function to get user without password
const getUserWithoutPassword = (user) => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

module.exports = {
    authenticateToken,
    requireAdmin,
    findUserByEmail,
    findUserById,
    createUser,
    generateToken,
    getUserWithoutPassword,
    users // Export for debugging (remove in production)
};