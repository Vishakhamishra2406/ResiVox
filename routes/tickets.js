const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const TicketManager = require('../services/TicketManager');

const router = express.Router();
const ticketManager = new TicketManager();

// Get all tickets (admin) or user tickets (resident)
router.get('/', authenticateToken, (req, res) => {
    try {
        console.log('=== TICKETS API DEBUG ===');
        console.log('User requesting tickets:', req.user);
        console.log('User role:', req.user.role);
        console.log('User ID:', req.user.id);
        
        let tickets;
        
        if (req.user.role === 'admin') {
            tickets = ticketManager.getAllTickets();
            console.log('Admin requesting all tickets, found:', tickets.length);
        } else {
            tickets = ticketManager.getUserTickets(req.user.id);
            console.log('Resident requesting user tickets, found:', tickets.length);
        }
        
        console.log('Tickets to return:', tickets);
        
        const stats = ticketManager.getTicketStats();
        console.log('Ticket stats:', stats);
        
        const response = {
            success: true,
            tickets,
            stats
        };
        
        console.log('Sending response:', response);
        console.log('=== END TICKETS API DEBUG ===');
        
        res.json(response);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tickets'
        });
    }
});

// Create ticket from voice input
router.post('/voice', authenticateToken, (req, res) => {
    try {
        const { voiceInput, location } = req.body;
        
        if (!voiceInput) {
            return res.status(400).json({
                success: false,
                message: 'Voice input is required'
            });
        }
        
        const ticket = ticketManager.createTicketFromVoice(
            voiceInput,
            req.user.id,
            location || req.user.unitNumber
        );
        
        res.json({
            success: true,
            ticket,
            message: `Ticket #${ticket.id} created successfully with ${ticket.priority} priority`
        });
    } catch (error) {
        console.error('Error creating ticket from voice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket'
        });
    }
});

// Get specific ticket
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const ticket = ticketManager.getTicket(req.params.id);
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        // Check if user can access this ticket
        if (req.user.role !== 'admin' && ticket.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        res.json({
            success: true,
            ticket
        });
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch ticket'
        });
    }
});

// Update ticket status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }
        
        const ticket = ticketManager.updateTicketStatus(req.params.id, status);
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        res.json({
            success: true,
            ticket,
            message: `Ticket #${ticket.id} status updated to ${status}`
        });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update ticket status'
        });
    }
});

// Assign ticket to technician (admin only)
router.put('/:id/assign', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { technicianId } = req.body;
        
        if (!technicianId) {
            return res.status(400).json({
                success: false,
                message: 'Technician ID is required'
            });
        }
        
        const ticket = ticketManager.assignTicket(req.params.id, technicianId);
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket or technician not found'
            });
        }
        
        res.json({
            success: true,
            ticket,
            message: `Ticket #${ticket.id} assigned to ${ticket.technician}`
        });
    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign ticket'
        });
    }
});

// Get available technicians (admin only)
router.get('/technicians/available', authenticateToken, requireAdmin, (req, res) => {
    try {
        const technicians = ticketManager.getAvailableTechnicians();
        
        res.json({
            success: true,
            technicians
        });
    } catch (error) {
        console.error('Error fetching technicians:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technicians'
        });
    }
});

// Get all technicians (admin only)
router.get('/technicians/all', authenticateToken, requireAdmin, (req, res) => {
    try {
        const technicians = ticketManager.getAllTechnicians();
        
        res.json({
            success: true,
            technicians
        });
    } catch (error) {
        console.error('Error fetching all technicians:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technicians'
        });
    }
});

// Get ticket statistics (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, (req, res) => {
    try {
        const stats = ticketManager.getTicketStats();
        const trends = ticketManager.getIssueTrends();
        
        res.json({
            success: true,
            stats,
            trends
        });
    } catch (error) {
        console.error('Error fetching ticket statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

// Debug endpoint to see all tickets (temporary)
router.get('/debug/all', authenticateToken, (req, res) => {
    try {
        const allTickets = ticketManager.getAllTickets();
        console.log('DEBUG: All tickets in storage:', allTickets);
        
        res.json({
            success: true,
            allTickets,
            userRequesting: req.user,
            totalCount: allTickets.length
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Debug endpoint failed'
        });
    }
});

module.exports = router;