// Event Management Service
// In-memory storage (in production, this would be a database)
let globalEventStorage = [
    // Sample events for demo
    {
        id: '1',
        title: 'Community BBQ',
        description: 'Join us for a fun BBQ event at the terrace',
        date: new Date(Date.now() + 604800000).toISOString(), // 1 week from now
        location: 'Terrace',
        facility: 'Terrace',
        category: 'Food & Social',
        status: 'Planned',
        estimatedAttendance: 50,
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        promotions: []
    },
    {
        id: '2',
        title: 'Yoga Session',
        description: 'Morning yoga in the garden',
        date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
        location: 'Garden',
        facility: 'Garden',
        category: 'Fitness',
        status: 'Active',
        estimatedAttendance: 25,
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        promotions: []
    },
    {
        id: '3',
        title: 'Movie Night',
        description: 'Outdoor movie screening under the stars',
        date: new Date(Date.now() + 432000000).toISOString(), // 5 days from now
        location: 'Garden',
        facility: 'Garden',
        category: 'Entertainment',
        status: 'Planned',
        estimatedAttendance: 40,
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
        promotions: []
    }
];

let globalEventSuggestions = [];
let globalEventFeedback = [];

class EventManager {
    constructor() {
        // Use global storage instead of instance storage
        this.events = globalEventStorage;
        this.eventSuggestions = globalEventSuggestions;
        this.feedback = globalEventFeedback;
        this.facilities = [
            { name: 'Terrace', capacity: 50, available: true },
            { name: 'Lounge', capacity: 30, available: true },
            { name: 'Garden', capacity: 40, available: true },
            { name: 'Community Hall', capacity: 80, available: true },
            { name: 'Gym', capacity: 20, available: true }
        ];
        this.pastEvents = [
            { name: 'Movie Night', attendance: 45, rating: 4.6, engagement: 'High', facility: 'Terrace' },
            { name: 'Yoga Morning', attendance: 28, rating: 4.2, engagement: 'Medium', facility: 'Garden' },
            { name: 'Board Games Evening', attendance: 22, rating: 4.4, engagement: 'Medium', facility: 'Lounge' },
            { name: 'BBQ Party', attendance: 52, rating: 4.8, engagement: 'High', facility: 'Terrace' },
            { name: 'Fitness Boot Camp', attendance: 35, rating: 4.3, engagement: 'High', facility: 'Gym' }
        ];
    }

    // Create new event
    createEvent(eventData, createdBy = 'admin') {
        const event = {
            id: Date.now().toString(),
            title: eventData.title,
            description: eventData.description,
            date: eventData.date,
            location: eventData.location || eventData.facility,
            facility: eventData.facility || eventData.location,
            category: eventData.category || 'General',
            status: eventData.status || 'Planned',
            estimatedAttendance: eventData.estimatedAttendance || 20,
            createdAt: new Date().toISOString(),
            createdBy: createdBy,
            promotions: []
        };

        this.events.push(event);
        console.log('New event created:', event);
        return event;
    }

    // Generate AI event suggestions
    generateEventSuggestions() {
        const suggestions = [];
        const currentDate = new Date();
        const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
        const currentMonth = currentDate.getMonth();
        
        // Weekend suggestions
        if (isWeekend) {
            suggestions.push({
                id: Date.now() + 1,
                title: 'Weekend Movie Night',
                description: 'Outdoor movie screening in the garden area',
                facility: 'Garden',
                reason: 'High past engagement + Weekend timing + Garden available',
                estimatedAttendance: 40,
                suggestedDate: this.getNextWeekend(),
                category: 'Entertainment'
            });
        }

        // Fitness suggestions based on past success
        const fitnessEvents = this.pastEvents.filter(e => 
            e.name.includes('Fitness') || e.name.includes('Yoga')
        );
        if (fitnessEvents.length > 0 && this.isFacilityAvailable('Gym')) {
            suggestions.push({
                id: Date.now() + 2,
                title: 'Morning Fitness Session',
                description: 'Community fitness workout in the gym',
                facility: 'Gym',
                reason: 'Past fitness events had high engagement + Gym available',
                estimatedAttendance: 25,
                suggestedDate: this.getNextWeekday(),
                category: 'Fitness'
            });
        }

        // Festival/seasonal suggestions
        if (this.isFestivalSeason(currentMonth)) {
            suggestions.push({
                id: Date.now() + 3,
                title: 'Cultural Celebration',
                description: 'Community cultural event in the hall',
                facility: 'Community Hall',
                reason: 'Festival season + Large venue available',
                estimatedAttendance: 60,
                suggestedDate: this.getNextWeekend(),
                category: 'Cultural'
            });
        }

        // Social gathering suggestions
        if (this.isFacilityAvailable('Lounge')) {
            suggestions.push({
                id: Date.now() + 4,
                title: 'Community Game Night',
                description: 'Board games and social interaction in the lounge',
                facility: 'Lounge',
                reason: 'Past board game events were successful + Lounge available',
                estimatedAttendance: 20,
                suggestedDate: this.getNextFriday(),
                category: 'Social'
            });
        }

        // Outdoor suggestions based on weather/season
        if (this.isGoodWeatherSeason() && this.isFacilityAvailable('Terrace')) {
            suggestions.push({
                id: Date.now() + 5,
                title: 'Terrace BBQ Evening',
                description: 'Community BBQ and socializing on the terrace',
                facility: 'Terrace',
                reason: 'BBQ events have highest ratings + Good weather + Terrace available',
                estimatedAttendance: 50,
                suggestedDate: this.getNextSaturday(),
                category: 'Food & Social'
            });
        }

        this.eventSuggestions = suggestions;
        return suggestions;
    }

    // Check if facility is available
    isFacilityAvailable(facilityName) {
        const facility = this.facilities.find(f => f.name === facilityName);
        return facility && facility.available;
    }

    // Get next weekend date
    getNextWeekend() {
        const date = new Date();
        const daysUntilSaturday = (6 - date.getDay()) % 7;
        date.setDate(date.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
        return date.toISOString().split('T')[0];
    }

    // Get next weekday
    getNextWeekday() {
        const date = new Date();
        if (date.getDay() === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
        else if (date.getDay() === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday
        else date.setDate(date.getDate() + 1); // Next day
        return date.toISOString().split('T')[0];
    }

    // Get next Friday
    getNextFriday() {
        const date = new Date();
        const daysUntilFriday = (5 - date.getDay() + 7) % 7;
        date.setDate(date.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
        return date.toISOString().split('T')[0];
    }

    // Get next Saturday
    getNextSaturday() {
        const date = new Date();
        const daysUntilSaturday = (6 - date.getDay() + 7) % 7;
        date.setDate(date.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
        return date.toISOString().split('T')[0];
    }

    // Check if it's festival season
    isFestivalSeason(month) {
        // Festival months: October (Diwali), December (Christmas), March (Holi), etc.
        return [2, 9, 11].includes(month);
    }

    // Check if it's good weather season
    isGoodWeatherSeason() {
        const month = new Date().getMonth();
        // Good weather months (avoid extreme summer/winter)
        return [1, 2, 3, 9, 10, 11].includes(month);
    }

    // Approve event suggestion
    approveEventSuggestion(suggestionId) {
        const suggestion = this.eventSuggestions.find(s => s.id === suggestionId);
        if (!suggestion) return null;

        const event = {
            id: Date.now(),
            title: suggestion.title,
            description: suggestion.description,
            facility: suggestion.facility,
            date: suggestion.suggestedDate,
            category: suggestion.category,
            estimatedAttendance: suggestion.estimatedAttendance,
            status: 'Approved',
            createdAt: new Date().toISOString(),
            promotions: []
        };

        this.events.push(event);
        
        // Remove from suggestions
        this.eventSuggestions = this.eventSuggestions.filter(s => s.id !== suggestionId);
        
        return event;
    }

    // Generate promotion content
    generatePromotionContent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return null;

        const promotions = {
            whatsapp: this.generateWhatsAppMessage(event),
            bulletin: this.generateBulletinText(event),
            voice: this.generateVoiceScript(event)
        };

        // Store promotions with event
        event.promotions = promotions;
        
        return promotions;
    }

    // Generate WhatsApp message
    generateWhatsAppMessage(event) {
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `🎉 *${event.title}* 🎉

Join us for an amazing community event!

📅 *When:* ${eventDate}
📍 *Where:* ${event.facility}
👥 *Expected:* ${event.estimatedAttendance} residents

${event.description}

Don't miss out on the fun! See you there! 🌟

_Reply with ✅ if you're attending_`;
    }

    // Generate bulletin board text
    generateBulletinText(event) {
        const eventDate = new Date(event.date).toLocaleDateString();
        
        return `COMMUNITY EVENT ANNOUNCEMENT

🎊 ${event.title.toUpperCase()} 🎊

${event.description}

Date: ${eventDate}
Venue: ${event.facility}
Expected Attendance: ${event.estimatedAttendance} residents

Come together with your neighbors for a wonderful time!

For more information, contact the management office.

Let's make memories together!

- Community Management Team`;
    }

    // Generate voice announcement script
    generateVoiceScript(event) {
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });

        return `Attention residents! We have an exciting community event coming up. 

Join us for ${event.title} on ${eventDate} at our ${event.facility}. 

${event.description}

This is a great opportunity to connect with your neighbors and enjoy some quality time together. 

We expect around ${event.estimatedAttendance} residents to participate. 

Mark your calendars and we'll see you there! 

For any questions, please contact the management office.`;
    }

    // Collect event feedback
    collectFeedback(eventId, userId, rating, comment, source = 'Voice') {
        const feedback = {
            id: Date.now(),
            eventId,
            userId,
            rating: parseInt(rating),
            comment,
            source,
            sentiment: this.analyzeSentiment(comment, rating),
            createdAt: new Date().toISOString()
        };

        this.feedback.push(feedback);
        return feedback;
    }

    // Analyze sentiment
    analyzeSentiment(comment, rating) {
        if (rating >= 4) return 'positive';
        if (rating <= 2) return 'negative';
        
        const positiveWords = ['great', 'amazing', 'excellent', 'wonderful', 'fantastic', 'love', 'awesome'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'boring', 'disappointing'];
        
        const commentLower = comment.toLowerCase();
        
        const positiveCount = positiveWords.filter(word => commentLower.includes(word)).length;
        const negativeCount = negativeWords.filter(word => commentLower.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        
        return 'neutral';
    }

    // Get event analytics
    getEventAnalytics() {
        const analytics = {
            totalEvents: this.events.length,
            upcomingEvents: this.events.filter(e => new Date(e.date) > new Date()).length,
            pastEvents: this.pastEvents.length,
            averageAttendance: this.calculateAverageAttendance(),
            averageRating: this.calculateAverageRating(),
            popularFacilities: this.getPopularFacilities(),
            feedbackSummary: this.getFeedbackSummary()
        };

        return analytics;
    }

    // Calculate average attendance
    calculateAverageAttendance() {
        if (this.pastEvents.length === 0) return 0;
        const total = this.pastEvents.reduce((sum, event) => sum + event.attendance, 0);
        return Math.round(total / this.pastEvents.length);
    }

    // Calculate average rating
    calculateAverageRating() {
        if (this.pastEvents.length === 0) return 0;
        const total = this.pastEvents.reduce((sum, event) => sum + event.rating, 0);
        return (total / this.pastEvents.length).toFixed(1);
    }

    // Get popular facilities
    getPopularFacilities() {
        const facilityCount = {};
        
        this.pastEvents.forEach(event => {
            facilityCount[event.facility] = (facilityCount[event.facility] || 0) + 1;
        });

        return Object.entries(facilityCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([facility, count]) => ({ facility, count }));
    }

    // Get feedback summary
    getFeedbackSummary() {
        const total = this.feedback.length;
        const positive = this.feedback.filter(f => f.sentiment === 'positive').length;
        const neutral = this.feedback.filter(f => f.sentiment === 'neutral').length;
        const negative = this.feedback.filter(f => f.sentiment === 'negative').length;

        return { total, positive, neutral, negative };
    }

    // Get all events
    getAllEvents() {
        return this.events;
    }

    // Get upcoming events
    getUpcomingEvents() {
        const now = new Date();
        return this.events.filter(event => new Date(event.date) > now);
    }

    // Get event suggestions
    getEventSuggestions() {
        return this.eventSuggestions;
    }

    // Get past events
    getPastEvents() {
        return this.pastEvents;
    }

    // Get all feedback
    getAllFeedback() {
        return this.feedback;
    }
}

module.exports = EventManager;