const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Import routes and middleware
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const eventRoutes = require('./routes/events');
const voiceRoutes = require('./routes/voice');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));
} else {
    // In development, serve the vanilla JS version as fallback
    app.use(express.static('public'));
}

// Auth routes
app.use('/api/auth', authRoutes);

// API routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/voice', voiceRoutes);

// Authentication page
app.get('/auth', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'auth.html'));
    }
});

// Protected dashboard route
app.get('/', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Catch all handler for React Router (production only)
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
}

// Basic API endpoints for future backend integration
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'ResiVox API is running',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint for debugging
app.post('/api/test', (req, res) => {
    console.log('Test request received:', req.body);
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0);
    res.json({ 
        message: 'Test endpoint working',
        receivedData: req.body,
        jwtSecretExists: !!process.env.JWT_SECRET
    });
});

// Protected API endpoints (legacy - replaced by dedicated route files)
// app.get('/api/tickets', authenticateToken, (req, res) => {
//     res.json({ 
//         message: 'Tickets API - Coming Soon',
//         user: req.user 
//     });
// });

// app.get('/api/events', authenticateToken, (req, res) => {
//     res.json({ 
//         message: 'Events API - Coming Soon',
//         user: req.user 
//     });
// });

// app.get('/api/feedback', authenticateToken, (req, res) => {
//     res.json({ 
//         message: 'Feedback API - Coming Soon',
//         user: req.user 
//     });
// });

// app.get('/api/analytics', authenticateToken, (req, res) => {
//     res.json({ 
//         message: 'Analytics API - Coming Soon',
//         user: req.user 
//     });
// });

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ResiVox Frontend Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
});