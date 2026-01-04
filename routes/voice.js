const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const TicketManager = require('../services/TicketManager');
const EventManager = require('../services/EventManager');
const OmnidimService = require('../services/OmnidimService');

const router = express.Router();
const ticketManager = new TicketManager();
const eventManager = new EventManager();
const omnidimService = new OmnidimService();

// Process voice command
router.post('/process', authenticateToken, async (req, res) => {
    try {
        const { voiceInput, context } = req.body;
        
        if (!voiceInput) {
            return res.status(400).json({
                success: false,
                message: 'Voice input is required'
            });
        }
        
        console.log('Processing voice command:', voiceInput, 'for user:', req.user.email);
        
        // Enhanced processing with Omnidim.io
        const enhancedResult = await omnidimService.enhancedVoiceProcessing(
            voiceInput, 
            req.user.id, 
            {
                userRole: req.user.role,
                location: context?.location || req.user.unitNumber,
                currentPage: context?.currentPage
            }
        );
        
        let response = null;
        let action = 'unknown';
        
        if (enhancedResult.success) {
            const processedText = enhancedResult.processedText;
            const intent = enhancedResult.intent;
            const entities = enhancedResult.entities;
            
            // Use intent-based processing when available
            switch (intent) {
                case 'check_ticket_status':
                    const ticketId = entities.ticketId || extractTicketId(processedText);
                    if (ticketId) {
                        const ticket = ticketManager.getTicket(ticketId);
                        if (ticket && (req.user.role === 'admin' || ticket.userId === req.user.id)) {
                            action = 'ticket_status';
                            response = {
                                message: `Ticket #${ticketId} is currently ${ticket.status}. ${getStatusMessage(ticket.status)}`,
                                ticket: ticket
                            };
                        } else {
                            response = {
                                message: `I couldn't find ticket #${ticketId} or you don't have access to it.`
                            };
                        }
                    } else {
                        // General ticket inquiry
                        const userTickets = req.user.role === 'admin' 
                            ? ticketManager.getAllTickets() 
                            : ticketManager.getUserTickets(req.user.id);
                        
                        const openTickets = userTickets.filter(t => t.status !== 'Resolved');
                        action = 'ticket_inquiry';
                        response = {
                            message: `You have ${openTickets.length} open tickets. ${openTickets.length > 0 ? 'Would you like me to check a specific ticket number?' : 'All your tickets are resolved.'}`,
                            tickets: openTickets
                        };
                    }
                    break;
                    
                case 'create_complaint':
                    const ticket = ticketManager.createTicketFromVoice(
                        processedText,
                        req.user.id,
                        entities.location || context?.location || req.user.unitNumber
                    );
                    
                    // Override priority if detected by Omnidim
                    if (entities.priority) {
                        ticket.priority = entities.priority;
                    }
                    
                    action = 'create_ticket';
                    response = {
                        message: `✅ Complaint received! Your ticket ID is #${ticket.id}. Priority: ${ticket.priority}. ${ticket.technician ? `Assigned to ${ticket.technician}.` : 'A technician will be assigned shortly.'} You can check status anytime by saying "Check ticket ${ticket.id}".`,
                        ticket: ticket
                    };
                    break;
                    
                case 'event_feedback':
                    const rating = entities.rating || extractRating(processedText);
                    
                    const feedback = eventManager.collectFeedback(
                        0, // Generic event feedback
                        req.user.id,
                        rating || 3,
                        processedText,
                        'Voice'
                    );
                    
                    action = 'event_feedback';
                    response = {
                        message: `Thank you for your ${rating ? `${rating}-star` : ''} feedback! Your input helps us improve our community events.`,
                        feedback: feedback
                    };
                    break;
                    
                case 'event_inquiry':
                    const upcomingEvents = eventManager.getUpcomingEvents();
                    action = 'event_inquiry';
                    
                    if (upcomingEvents.length > 0) {
                        const nextEvent = upcomingEvents[0];
                        response = {
                            message: `The next event is "${nextEvent.title}" on ${new Date(nextEvent.date).toLocaleDateString()}. ${nextEvent.description}`,
                            events: upcomingEvents.slice(0, 3)
                        };
                    } else {
                        response = {
                            message: "There are no upcoming events scheduled at the moment. Check back later for new community activities!",
                            events: []
                        };
                    }
                    break;
                    
                case 'help_request':
                    action = 'help';
                    response = {
                        message: "I can help you with: reporting issues or complaints, checking ticket status, giving event feedback, and finding information about upcoming events. Just speak naturally!"
                    };
                    break;
                    
                default:
                    // Fallback to basic text processing
                    const result = await processBasicCommand(processedText, req.user, context);
                    action = result.action;
                    response = result.response;
            }
        } else {
            // Fallback to basic processing if Omnidim fails
            const result = await processBasicCommand(voiceInput, req.user, context);
            action = result.action;
            response = result.response;
        }
        
        // Log the interaction for analytics
        console.log(`Voice interaction - User: ${req.user.email}, Action: ${action}, Intent: ${enhancedResult.intent || 'unknown'}`);
        
        res.json({
            success: true,
            action: action,
            response: response.message,
            confidence: enhancedResult.confidence || 0.7,
            intent: enhancedResult.intent,
            data: {
                ticket: response.ticket,
                tickets: response.tickets,
                events: response.events,
                feedback: response.feedback
            }
        });
        
    } catch (error) {
        console.error('Error processing voice command:', error);
        res.status(500).json({
            success: false,
            message: 'Sorry, I encountered an error processing your request. Please try again.'
        });
    }
});

// Fallback basic command processing
async function processBasicCommand(command, user, context) {
    const lowerCommand = command.toLowerCase().trim();
    
    // Ticket status check
    if (lowerCommand.includes('status') || lowerCommand.includes('ticket')) {
        const ticketMatch = lowerCommand.match(/ticket\s+(\d+)/);
        if (ticketMatch) {
            const ticketId = ticketMatch[1];
            const ticket = ticketManager.getTicket(ticketId);
            
            if (ticket && (user.role === 'admin' || ticket.userId === user.id)) {
                return {
                    action: 'ticket_status',
                    response: {
                        message: `Ticket #${ticketId} is currently ${ticket.status}. ${getStatusMessage(ticket.status)}`,
                        ticket: ticket
                    }
                };
            } else {
                return {
                    action: 'ticket_status',
                    response: {
                        message: `I couldn't find ticket #${ticketId} or you don't have access to it.`
                    }
                };
            }
        } else {
            // General ticket inquiry
            const userTickets = user.role === 'admin' 
                ? ticketManager.getAllTickets() 
                : ticketManager.getUserTickets(user.id);
            
            const openTickets = userTickets.filter(t => t.status !== 'Resolved');
            return {
                action: 'ticket_inquiry',
                response: {
                    message: `You have ${openTickets.length} open tickets. ${openTickets.length > 0 ? 'Would you like me to check a specific ticket number?' : 'All your tickets are resolved.'}`,
                    tickets: openTickets
                }
            };
        }
    }
    // Complaint logging
    else if (isComplaint(lowerCommand)) {
        const ticket = ticketManager.createTicketFromVoice(
            command,
            user.id,
            context?.location || user.unitNumber
        );
        
        return {
            action: 'create_ticket',
            response: {
                message: `Ticket #${ticket.id} created successfully with ${ticket.priority} priority. ${ticket.technician ? `Assigned to ${ticket.technician}.` : 'A technician will be assigned shortly.'}`,
                ticket: ticket
            }
        };
    }
    // Event feedback
    else if (lowerCommand.includes('event') && (lowerCommand.includes('feedback') || lowerCommand.includes('rating') || lowerCommand.includes('star'))) {
        const ratingMatch = lowerCommand.match(/(\d+)\s*star/);
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : 3;
        
        const feedback = eventManager.collectFeedback(
            0, // Generic event feedback
            user.id,
            rating,
            command,
            'Voice'
        );
        
        return {
            action: 'event_feedback',
            response: {
                message: `Thank you for your ${rating ? `${rating}-star` : ''} feedback! Your input helps us improve our community events.`,
                feedback: feedback
            }
        };
    }
    // Event inquiry
    else if (lowerCommand.includes('event') || lowerCommand.includes('activity')) {
        const upcomingEvents = eventManager.getUpcomingEvents();
        
        if (upcomingEvents.length > 0) {
            const nextEvent = upcomingEvents[0];
            return {
                action: 'event_inquiry',
                response: {
                    message: `The next event is "${nextEvent.title}" on ${new Date(nextEvent.date).toLocaleDateString()}. ${nextEvent.description}`,
                    events: upcomingEvents.slice(0, 3)
                }
            };
        } else {
            return {
                action: 'event_inquiry',
                response: {
                    message: "There are no upcoming events scheduled at the moment. Check back later for new community activities!",
                    events: []
                }
            };
        }
    }
    // Help/General inquiry
    else if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
        return {
            action: 'help',
            response: {
                message: "I can help you with: reporting issues or complaints, checking ticket status, giving event feedback, and finding information about upcoming events. Just speak naturally!"
            }
        };
    }
    // Default response
    else {
        return {
            action: 'unknown',
            response: {
                message: "I heard you, but I'm not sure how to help with that. Try asking about ticket status, reporting a complaint, giving event feedback, or asking about upcoming events."
            }
        };
    }
}

// Omnidim.io webhook endpoint
router.post('/omnidim/webhook', async (req, res) => {
    try {
        console.log('Omnidim webhook received:', req.body);
        
        // Process the webhook data from Omnidim.io
        const { transcript, confidence, userId } = req.body;
        
        if (!transcript) {
            return res.status(400).json({
                success: false,
                message: 'Transcript is required'
            });
        }
        
        // Here you would process the Omnidim.io voice data
        // For now, we'll just log it and return success
        
        res.json({
            success: true,
            message: 'Webhook processed successfully',
            transcript: transcript,
            confidence: confidence
        });
        
    } catch (error) {
        console.error('Error processing Omnidim webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process webhook'
        });
    }
});

// Helper functions
function isComplaint(command) {
    const complaintKeywords = [
        'broken', 'leaking', 'not working', 'problem', 'issue', 'repair',
        'maintenance', 'fix', 'damaged', 'faulty', 'complaint', 'help',
        'urgent', 'emergency', 'water', 'electrical', 'plumbing', 'heating',
        'air conditioning', 'door', 'window', 'light', 'noise'
    ];
    return complaintKeywords.some(keyword => command.includes(keyword));
}

function getStatusMessage(status) {
    const messages = {
        'Open': 'We have received your request and will assign a technician soon.',
        'Assigned': 'A technician has been assigned and will contact you shortly.',
        'In Progress': 'Our technician is currently working on your request.',
        'Resolved': 'Your request has been completed. Please let us know if you need any follow-up.'
    };
    return messages[status] || '';
}

function extractTicketId(text) {
    const match = text.match(/ticket\s+(\d+)/i);
    return match ? match[1] : null;
}

function extractRating(text) {
    const match = text.match(/(\d+)\s*star/i);
    return match ? parseInt(match[1]) : null;
}

module.exports = router;