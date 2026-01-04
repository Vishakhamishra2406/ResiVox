// Omnidim.io Voice AI Integration Service
class OmnidimService {
    constructor() {
        this.apiKey = process.env.OMNIDIM_API_KEY;
        this.voiceEndpoint = process.env.OMNIDIM_VOICE_ENDPOINT || 'https://api.omnidim.io/v1/voice';
        this.webhookUrl = process.env.OMNIDIM_WEBHOOK_URL || 'http://localhost:3001/api/voice/omnidim/webhook';
    }

    // Process voice input through Omnidim.io
    async processVoiceInput(audioData, userId, context = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('Omnidim API key not configured');
            }

            const requestBody = {
                audio: audioData,
                userId: userId,
                context: {
                    application: 'ResiVox',
                    userRole: context.userRole || 'resident',
                    location: context.location,
                    ...context
                },
                webhook: this.webhookUrl,
                language: 'en-US',
                enableNLP: true,
                enableIntentRecognition: true
            };

            const response = await fetch(this.voiceEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Omnidim API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            return {
                success: true,
                transcript: result.transcript,
                confidence: result.confidence,
                intent: result.intent,
                entities: result.entities,
                sessionId: result.sessionId
            };

        } catch (error) {
            console.error('Omnidim service error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Process text input through Omnidim.io NLP
    async processTextInput(text, userId, context = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('Omnidim API key not configured');
            }

            const requestBody = {
                text: text,
                userId: userId,
                context: {
                    application: 'ResiVox',
                    userRole: context.userRole || 'resident',
                    location: context.location,
                    ...context
                },
                language: 'en-US',
                enableNLP: true,
                enableIntentRecognition: true
            };

            const response = await fetch(`${this.voiceEndpoint}/text`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Omnidim API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            return {
                success: true,
                intent: result.intent,
                entities: result.entities,
                confidence: result.confidence,
                processedText: result.processedText
            };

        } catch (error) {
            console.error('Omnidim text processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Enhanced voice command processing with Omnidim.io
    async enhancedVoiceProcessing(voiceInput, userId, context = {}) {
        try {
            // First, process through Omnidim for better NLP
            const omnidimResult = await this.processTextInput(voiceInput, userId, context);
            
            if (omnidimResult.success) {
                // Use Omnidim's intent recognition to improve command processing
                const enhancedContext = {
                    ...context,
                    intent: omnidimResult.intent,
                    entities: omnidimResult.entities,
                    confidence: omnidimResult.confidence
                };

                return {
                    success: true,
                    originalText: voiceInput,
                    processedText: omnidimResult.processedText || voiceInput,
                    intent: omnidimResult.intent,
                    entities: omnidimResult.entities,
                    confidence: omnidimResult.confidence,
                    enhancedContext: enhancedContext
                };
            } else {
                // Fallback to basic processing
                return {
                    success: true,
                    originalText: voiceInput,
                    processedText: voiceInput,
                    intent: this.detectBasicIntent(voiceInput),
                    entities: this.extractBasicEntities(voiceInput),
                    confidence: 0.7,
                    enhancedContext: context
                };
            }

        } catch (error) {
            console.error('Enhanced voice processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Basic intent detection fallback
    detectBasicIntent(text) {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('ticket') && lowerText.includes('status')) {
            return 'check_ticket_status';
        }
        
        if (this.isComplaint(lowerText)) {
            return 'create_complaint';
        }
        
        if (lowerText.includes('event') && (lowerText.includes('feedback') || lowerText.includes('rating'))) {
            return 'event_feedback';
        }
        
        if (lowerText.includes('event') || lowerText.includes('activity')) {
            return 'event_inquiry';
        }
        
        if (lowerText.includes('help')) {
            return 'help_request';
        }
        
        return 'general_inquiry';
    }

    // Basic entity extraction fallback
    extractBasicEntities(text) {
        const entities = {};
        
        // Extract ticket numbers
        const ticketMatch = text.match(/ticket\s+(\d+)/i);
        if (ticketMatch) {
            entities.ticketId = ticketMatch[1];
        }
        
        // Extract ratings
        const ratingMatch = text.match(/(\d+)\s*star/i);
        if (ratingMatch) {
            entities.rating = parseInt(ratingMatch[1]);
        }
        
        // Extract locations
        const locationMatch = text.match(/(?:unit|room|apartment|floor)\s+(\d+[a-z]?)/i);
        if (locationMatch) {
            entities.location = locationMatch[0];
        }
        
        // Extract priority indicators
        if (text.toLowerCase().includes('urgent') || text.toLowerCase().includes('emergency')) {
            entities.priority = 'P1';
        } else if (text.toLowerCase().includes('important') || text.toLowerCase().includes('asap')) {
            entities.priority = 'P2';
        }
        
        return entities;
    }

    // Helper method to detect complaints
    isComplaint(text) {
        const complaintKeywords = [
            'broken', 'leaking', 'not working', 'problem', 'issue', 'repair',
            'maintenance', 'fix', 'damaged', 'faulty', 'complaint', 'help',
            'urgent', 'emergency', 'water', 'electrical', 'plumbing', 'heating',
            'air conditioning', 'door', 'window', 'light', 'noise'
        ];
        return complaintKeywords.some(keyword => text.includes(keyword));
    }

    // Generate voice response using Omnidim.io TTS (if available)
    async generateVoiceResponse(text, userId, options = {}) {
        try {
            if (!this.apiKey) {
                return { success: false, error: 'Omnidim API key not configured' };
            }

            const requestBody = {
                text: text,
                userId: userId,
                voice: options.voice || 'default',
                speed: options.speed || 1.0,
                pitch: options.pitch || 1.0,
                format: options.format || 'mp3'
            };

            const response = await fetch(`${this.voiceEndpoint}/tts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Omnidim TTS error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            return {
                success: true,
                audioUrl: result.audioUrl,
                audioData: result.audioData
            };

        } catch (error) {
            console.error('Omnidim TTS error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = OmnidimService;