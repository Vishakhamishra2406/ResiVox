const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const EventManager = require('../services/EventManager');

const router = express.Router();
const eventManager = new EventManager();

// Get all events
router.get('/', authenticateToken, (req, res) => {
    try {
        console.log('=== EVENTS API DEBUG ===');
        console.log('User requesting events:', req.user.email);
        console.log('User role:', req.user.role);
        
        const events = eventManager.getAllEvents();
        const upcomingEvents = eventManager.getUpcomingEvents();
        const analytics = eventManager.getEventAnalytics();
        
        console.log('Total events:', events.length);
        console.log('Upcoming events:', upcomingEvents.length);
        console.log('Events to return:', events);
        console.log('=== END EVENTS API DEBUG ===');
        
        res.json({
            success: true,
            events,
            upcomingEvents,
            analytics
        });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events'
        });
    }
});

// Create new event (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
    try {
        console.log('Creating new event:', req.body);
        
        const { title, description, date, location, facility, category, estimatedAttendance } = req.body;
        
        if (!title || !description || !date || !location) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, date, and location are required'
            });
        }
        
        const eventData = {
            title,
            description,
            date,
            location,
            facility: facility || location,
            category,
            estimatedAttendance: parseInt(estimatedAttendance) || 20
        };
        
        const event = eventManager.createEvent(eventData, req.user.email);
        
        console.log('Event created successfully:', event);
        
        res.json({
            success: true,
            event,
            message: `Event "${title}" created successfully`
        });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create event'
        });
    }
});

// Get upcoming events
router.get('/upcoming', authenticateToken, (req, res) => {
    try {
        const upcomingEvents = eventManager.getUpcomingEvents();
        
        res.json({
            success: true,
            events: upcomingEvents
        });
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming events'
        });
    }
});

// Generate event suggestions (admin only)
router.get('/suggestions', authenticateToken, requireAdmin, (req, res) => {
    try {
        const suggestions = eventManager.generateEventSuggestions();
        
        res.json({
            success: true,
            suggestions
        });
    } catch (error) {
        console.error('Error generating event suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate event suggestions'
        });
    }
});

// Approve event suggestion (admin only)
router.post('/suggestions/:id/approve', authenticateToken, requireAdmin, (req, res) => {
    try {
        const suggestionId = parseInt(req.params.id);
        const event = eventManager.approveEventSuggestion(suggestionId);
        
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event suggestion not found'
            });
        }
        
        res.json({
            success: true,
            event,
            message: `Event "${event.title}" has been approved and scheduled`
        });
    } catch (error) {
        console.error('Error approving event suggestion:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve event suggestion'
        });
    }
});

// Generate promotions for event (admin only)
router.post('/:id/promotions', authenticateToken, requireAdmin, (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const promotions = eventManager.generatePromotionContent(eventId);
        
        if (!promotions) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }
        
        res.json({
            success: true,
            promotions,
            message: 'Promotions generated successfully'
        });
    } catch (error) {
        console.error('Error generating promotions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate promotions'
        });
    }
});

// Submit event feedback
router.post('/:id/feedback', authenticateToken, (req, res) => {
    try {
        const { rating, comment, source = 'Web' } = req.body;
        const eventId = parseInt(req.params.id);
        
        if (!rating || !comment) {
            return res.status(400).json({
                success: false,
                message: 'Rating and comment are required'
            });
        }
        
        const feedback = eventManager.collectFeedback(
            eventId,
            req.user.id,
            rating,
            comment,
            source
        );
        
        res.json({
            success: true,
            feedback,
            message: 'Thank you for your feedback!'
        });
    } catch (error) {
        console.error('Error submitting event feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback'
        });
    }
});

// Submit voice feedback for event
router.post('/feedback/voice', authenticateToken, (req, res) => {
    try {
        const { voiceInput } = req.body;
        
        if (!voiceInput) {
            return res.status(400).json({
                success: false,
                message: 'Voice input is required'
            });
        }
        
        // Extract rating from voice input
        const ratingMatch = voiceInput.match(/(\d+)\s*star/i);
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : 3; // Default to 3 if no rating found
        
        // Use a generic event ID for voice feedback (in real system, this would be more sophisticated)
        const eventId = 0; // Generic event feedback
        
        const feedback = eventManager.collectFeedback(
            eventId,
            req.user.id,
            rating,
            voiceInput,
            'Voice'
        );
        
        res.json({
            success: true,
            feedback,
            message: `Thank you for your ${rating}-star feedback!`
        });
    } catch (error) {
        console.error('Error submitting voice feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit voice feedback'
        });
    }
});

// Get event analytics (admin only)
router.get('/analytics', authenticateToken, requireAdmin, (req, res) => {
    try {
        const analytics = eventManager.getEventAnalytics();
        const pastEvents = eventManager.getPastEvents();
        const allFeedback = eventManager.getAllFeedback();
        
        res.json({
            success: true,
            analytics,
            pastEvents,
            feedback: allFeedback
        });
    } catch (error) {
        console.error('Error fetching event analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch event analytics'
        });
    }
});

// Get all feedback (admin only)
router.get('/feedback', authenticateToken, requireAdmin, (req, res) => {
    try {
        const feedback = eventManager.getAllFeedback();
        
        res.json({
            success: true,
            feedback
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch feedback'
        });
    }
});

module.exports = router;