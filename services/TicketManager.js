// Ticket Management Service
// In-memory storage (in production, this would be a database)
let globalTicketStorage = [];

let globalTechnicianStorage = [
    { id: 1, name: 'John Smith', specialization: 'Plumbing', available: true },
    { id: 2, name: 'Mike Johnson', specialization: 'Electrical', available: true },
    { id: 3, name: 'Sarah Wilson', specialization: 'Internet', available: true },
    { id: 4, name: 'David Brown', specialization: 'Housekeeping', available: true },
    { id: 5, name: 'Lisa Garcia', specialization: 'Plumbing', available: true },
    { id: 6, name: 'Tom Anderson', specialization: 'Electrical', available: true }
];

class TicketManager {
    constructor() {
        // Use global storage instead of instance storage
        this.tickets = globalTicketStorage;
        this.technicians = globalTechnicianStorage;
        this.priorityKeywords = {
            P1: ['fire', 'gas', 'flooding', 'power outage', 'emergency', 'urgent', 'danger'],
            P2: ['water leakage', 'leak', 'ac not working', 'heating', 'no water', 'broken'],
            P3: ['slow internet', 'lift issue', 'elevator', 'noise', 'maintenance'],
            P4: ['cleaning', 'bulb replacement', 'light', 'minor repair', 'request']
        };
        this.issueTypes = {
            'water': 'Plumbing',
            'leak': 'Plumbing',
            'plumbing': 'Plumbing',
            'toilet': 'Plumbing',
            'bathroom': 'Plumbing',
            'kitchen': 'Plumbing',
            'electrical': 'Electrical',
            'power': 'Electrical',
            'light': 'Electrical',
            'switch': 'Electrical',
            'internet': 'Internet',
            'wifi': 'Internet',
            'network': 'Internet',
            'cleaning': 'Housekeeping',
            'housekeeping': 'Housekeeping',
            'maintenance': 'Housekeeping'
        };
    }

    // Create ticket from voice input
    createTicketFromVoice(voiceInput, userId, userLocation) {
        const ticket = {
            id: this.generateTicketId(),
            title: this.generateTitle(voiceInput),
            description: voiceInput,
            issueType: this.detectIssueType(voiceInput),
            priority: this.assignPriority(voiceInput),
            status: 'Open',
            location: this.extractLocation(voiceInput, userLocation),
            userId: userId,
            createdAt: new Date().toISOString(),
            source: 'Voice',
            technician: null,
            assignedAt: null,
            resolvedAt: null
        };

        // Auto-assign technician if available
        this.autoAssignTechnician(ticket);
        
        this.tickets.push(ticket);
        return ticket;
    }

    // Generate unique ticket ID
    generateTicketId() {
        return Date.now().toString();
    }

    // Detect issue type from voice input
    detectIssueType(voiceInput) {
        const input = voiceInput.toLowerCase();
        
        for (const [keyword, type] of Object.entries(this.issueTypes)) {
            if (input.includes(keyword)) {
                return type;
            }
        }
        
        return 'General';
    }

    // Assign priority based on keywords
    assignPriority(voiceInput) {
        const input = voiceInput.toLowerCase();
        
        for (const [priority, keywords] of Object.entries(this.priorityKeywords)) {
            for (const keyword of keywords) {
                if (input.includes(keyword)) {
                    return priority;
                }
            }
        }
        
        return 'P3'; // Default medium priority
    }

    // Extract location from voice input
    extractLocation(voiceInput, userLocation) {
        const input = voiceInput.toLowerCase();
        
        // Look for room/unit numbers
        const roomMatch = input.match(/(?:room|unit|apartment)\s+(\d+[a-z]?)/i);
        if (roomMatch) {
            return `Room ${roomMatch[1]}`;
        }
        
        // Look for floor references
        const floorMatch = input.match(/(?:floor|level)\s+(\d+)/i);
        if (floorMatch) {
            return `Floor ${floorMatch[1]}`;
        }
        
        // Look for specific areas
        const areas = ['kitchen', 'bathroom', 'bedroom', 'living room', 'balcony', 'terrace'];
        for (const area of areas) {
            if (input.includes(area)) {
                return `${userLocation} - ${area.charAt(0).toUpperCase() + area.slice(1)}`;
            }
        }
        
        return userLocation || 'Not specified';
    }

    // Generate ticket title
    generateTitle(voiceInput) {
        const input = voiceInput.toLowerCase();
        
        if (input.includes('leak')) return 'Water Leak Issue';
        if (input.includes('electrical') || input.includes('power')) return 'Electrical Problem';
        if (input.includes('internet') || input.includes('wifi')) return 'Internet Connectivity Issue';
        if (input.includes('cleaning')) return 'Cleaning Request';
        if (input.includes('maintenance')) return 'Maintenance Request';
        if (input.includes('noise')) return 'Noise Complaint';
        if (input.includes('heating') || input.includes('ac')) return 'HVAC Issue';
        
        return 'General Service Request';
    }

    // Auto-assign technician based on issue type and availability
    autoAssignTechnician(ticket) {
        const availableTechnicians = this.technicians.filter(tech => 
            tech.available && tech.specialization === ticket.issueType
        );
        
        if (availableTechnicians.length > 0) {
            // Assign to first available technician
            const assignedTech = availableTechnicians[0];
            ticket.technician = assignedTech.name;
            ticket.technicianId = assignedTech.id;
            ticket.status = 'Assigned';
            ticket.assignedAt = new Date().toISOString();
            
            // Mark technician as busy (in real system, this would be more sophisticated)
            assignedTech.available = false;
        }
    }

    // Get ticket by ID
    getTicket(ticketId) {
        return this.tickets.find(ticket => ticket.id === ticketId);
    }

    // Get tickets for a specific user
    getUserTickets(userId) {
        const userTickets = this.tickets.filter(ticket => ticket.userId === userId);
        console.log(`Getting tickets for user ${userId}:`, userTickets.length, 'found');
        console.log('User tickets:', userTickets);
        
        // If user has no tickets, create a sample ticket for demo purposes
        if (userTickets.length === 0) {
            console.log('No tickets found for user, creating sample ticket');
            const sampleTicket = {
                id: this.generateTicketId(),
                title: 'Welcome Sample Ticket',
                description: 'This is a sample ticket to demonstrate the system. You can create real tickets using the Voice Assistant.',
                issueType: 'General',
                priority: 'P3',
                status: 'Open',
                location: 'Your Unit',
                userId: userId,
                createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                source: 'System',
                technician: null,
                technicianId: null,
                assignedAt: null,
                resolvedAt: null
            };
            
            this.tickets.push(sampleTicket);
            console.log('Sample ticket created:', sampleTicket);
            return [sampleTicket];
        }
        
        return userTickets;
    }

    // Get all tickets (admin view)
    getAllTickets() {
        return this.tickets;
    }

    // Update ticket status
    updateTicketStatus(ticketId, status, technicianId = null) {
        const ticket = this.getTicket(ticketId);
        if (!ticket) return null;

        ticket.status = status;
        
        if (status === 'Resolved') {
            ticket.resolvedAt = new Date().toISOString();
            // Mark technician as available again
            if (ticket.technicianId) {
                const tech = this.technicians.find(t => t.id === ticket.technicianId);
                if (tech) tech.available = true;
            }
        }
        
        return ticket;
    }

    // Assign ticket to technician
    assignTicket(ticketId, technicianId) {
        const ticket = this.getTicket(ticketId);
        const technician = this.technicians.find(t => t.id === technicianId);
        
        if (!ticket || !technician) return null;
        
        ticket.technician = technician.name;
        ticket.technicianId = technicianId;
        ticket.status = 'Assigned';
        ticket.assignedAt = new Date().toISOString();
        
        technician.available = false;
        
        return ticket;
    }

    // Get available technicians
    getAvailableTechnicians() {
        return this.technicians.filter(tech => tech.available);
    }

    // Get all technicians
    getAllTechnicians() {
        return this.technicians;
    }

    // Get ticket statistics
    getTicketStats() {
        const total = this.tickets.length;
        const open = this.tickets.filter(t => t.status === 'Open').length;
        const assigned = this.tickets.filter(t => t.status === 'Assigned').length;
        const inProgress = this.tickets.filter(t => t.status === 'In Progress').length;
        const resolved = this.tickets.filter(t => t.status === 'Resolved').length;
        
        const highPriority = this.tickets.filter(t => 
            ['P1', 'P2'].includes(t.priority) && t.status !== 'Resolved'
        ).length;
        
        return {
            total,
            open,
            assigned,
            inProgress,
            resolved,
            highPriority
        };
    }

    // Get issue trends
    getIssueTrends() {
        const trends = {};
        
        this.tickets.forEach(ticket => {
            const type = ticket.issueType;
            if (!trends[type]) {
                trends[type] = { count: 0, locations: {} };
            }
            trends[type].count++;
            
            const location = ticket.location;
            if (!trends[type].locations[location]) {
                trends[type].locations[location] = 0;
            }
            trends[type].locations[location]++;
        });
        
        return trends;
    }
}

module.exports = TicketManager;