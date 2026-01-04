// ResiVox - Frontend Application
class ResiVox {
    constructor() {
        this.isListening = false;
        this.recognition = null;
        this.currentPage = 'dashboard';
        this.tickets = [];
        this.events = [];
        this.feedback = [];
        this.user = null;
        this.initialized = false;
        this.analytics = {
            voiceInteractions: 0,
            totalTickets: 0,
            activeEvents: 0,
            satisfactionRate: 0
        };

        this.checkAuthentication();
    }

    async checkAuthentication() {
        const token = localStorage.getItem('resivox_token');
        console.log('Checking authentication, token exists:', !!token);
        
        if (!token) {
            console.log('No token found, redirecting to auth');
            this.redirectToAuth();
            return;
        }

        try {
            console.log('Verifying token with server...');
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Token verification response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Token verification successful, user:', data.user);
                this.user = data.user;
                
                // Initialize the dashboard immediately
                this.setupRoleBasedDashboard();
                this.init();
                
                console.log('Dashboard initialization complete for user:', this.user.email);
            } else {
                console.log('Token verification failed, clearing storage');
                localStorage.removeItem('resivox_token');
                localStorage.removeItem('resivox_user');
                this.redirectToAuth();
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            // Don't clear storage on network errors - try to use cached user data
            const cachedUser = localStorage.getItem('resivox_user');
            if (cachedUser) {
                try {
                    this.user = JSON.parse(cachedUser);
                    console.log('Using cached user data:', this.user);
                    this.setupRoleBasedDashboard();
                    this.init();
                } catch (parseError) {
                    console.error('Failed to parse cached user data:', parseError);
                    this.redirectToAuth();
                }
            } else {
                console.log('No cached user data, redirecting to auth');
                this.redirectToAuth();
            }
        }
    }

    setupRoleBasedDashboard() {
        console.log('Setting up role-based dashboard for:', this.user.role);
        
        // Ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupRoleBasedUI();
            });
        } else {
            this.setupRoleBasedUI();
        }
    }

    setupRoleBasedUI() {
        console.log('Setting up UI for role:', this.user.role);
        
        if (this.user.role === 'resident') {
            this.setupResidentDashboard();
        } else if (this.user.role === 'admin') {
            this.setupAdminDashboard();
        }
        
        // Ensure the dashboard page is visible and active
        this.switchToPage('dashboard');
        
        console.log('Role-based dashboard setup complete');
    }

    setupResidentDashboard() {
        console.log('Setting up resident dashboard');
        
        // Hide admin-only navigation items
        const adminOnlyPages = ['analytics'];
        adminOnlyPages.forEach(page => {
            const navItem = document.querySelector(`[data-page="${page}"]`);
            if (navItem) {
                navItem.style.display = 'none';
                console.log('Hidden admin page:', page);
            }
        });

        // Update navigation labels for residents
        const ticketsNav = document.querySelector('[data-page="tickets"]');
        if (ticketsNav) {
            ticketsNav.innerHTML = '<i class="fas fa-ticket-alt"></i>My Tickets';
        }

        const eventsNav = document.querySelector('[data-page="events"]');
        if (eventsNav) {
            eventsNav.innerHTML = '<i class="fas fa-calendar-alt"></i>Event Notifications';
        }

        const feedbackNav = document.querySelector('[data-page="feedback"]');
        if (feedbackNav) {
            feedbackNav.innerHTML = '<i class="fas fa-star"></i>My Feedback';
        }

        const voiceNav = document.querySelector('[data-page="voice"]');
        if (voiceNav) {
            voiceNav.innerHTML = '<i class="fas fa-microphone"></i>Voice Assistant';
        }

        // Set default page to voice for residents
        this.currentPage = 'voice';
        
        console.log('Resident dashboard setup complete');
    }

    setupAdminDashboard() {
        console.log('Setting up admin dashboard');
        
        // Show all navigation items for admin
        const allNavItems = document.querySelectorAll('.nav-link[data-page]');
        allNavItems.forEach(item => {
            item.style.display = 'flex';
        });

        // Update navigation labels for admin with emojis and descriptions
        const dashboardNav = document.querySelector('[data-page="dashboard"]');
        if (dashboardNav) {
            dashboardNav.innerHTML = '<i class="fas fa-tachometer-alt"></i>🏠 Admin Dashboard';
        }

        const ticketsNav = document.querySelector('[data-page="tickets"]');
        if (ticketsNav) {
            ticketsNav.innerHTML = '<i class="fas fa-ticket-alt"></i>🎫 Ticket Management';
        }

        const eventsNav = document.querySelector('[data-page="events"]');
        if (eventsNav) {
            eventsNav.innerHTML = '<i class="fas fa-calendar-alt"></i>🎉 Event Management';
        }

        const feedbackNav = document.querySelector('[data-page="feedback"]');
        if (feedbackNav) {
            feedbackNav.innerHTML = '<i class="fas fa-chart-line"></i>📈 Feedback Analytics';
        }

        const voiceNav = document.querySelector('[data-page="voice"]');
        if (voiceNav) {
            voiceNav.innerHTML = '<i class="fas fa-microphone"></i>🎤 Voice Commands';
        }

        const analyticsNav = document.querySelector('[data-page="analytics"]');
        if (analyticsNav) {
            analyticsNav.innerHTML = '<i class="fas fa-chart-bar"></i>📊 Analytics';
        }

        // Set default page to dashboard for admin
        this.currentPage = 'dashboard';
        
        console.log('Admin dashboard setup complete');
    }

    redirectToAuth() {
        console.log('Redirecting to auth page');
        // Prevent infinite redirect loop
        if (window.location.pathname !== '/auth') {
            window.location.href = '/auth';
        }
    }

    init() {
        if (this.initialized) {
            console.log('ResiVox already initialized, skipping...');
            return;
        }
        
        console.log('Initializing ResiVox dashboard...');
        console.log('User data:', this.user);
        
        this.setupEventListeners();
        this.setupVoiceRecognition();
        this.updateUserInfo();
        this.loadDashboardData();
        
        // Load initial data
        this.loadTickets();
        this.loadEvents();
        this.loadFeedback();
        this.updateAnalytics();
        
        // Set the active navigation item
        this.switchToPage(this.currentPage);
        
        this.initialized = true;
        console.log('ResiVox dashboard initialized successfully');
        console.log('Current page:', this.currentPage);
        console.log('Analytics:', this.analytics);
    }

    updateUserInfo() {
        if (this.user) {
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = `${this.user.firstName} ${this.user.lastName}`;
            }
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const page = e.target.closest('.nav-link').dataset.page;
                this.switchToPage(page);
            });
        });

        // Search and filter - use event delegation since elements are dynamically created
        document.addEventListener('input', (e) => {
            if (e.target.id === 'ticket-search') {
                this.filterTickets();
            }
        });
        
        document.addEventListener('change', (e) => {
            if (e.target.id === 'ticket-filter') {
                this.filterTickets();
            }
        });
    }

    // Method to refresh tickets from server
    async refreshTickets() {
        console.log('Refreshing tickets from server...');
        await this.loadTickets();
        if (this.currentPage === 'tickets') {
            this.renderTickets();
        }
        this.updateDashboardStats();
    }

    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                console.log('Voice recognition started');
                this.updateVoiceUI(true);
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                this.displayTranscript(finalTranscript, interimTranscript);

                if (finalTranscript) {
                    this.processVoiceCommand(finalTranscript);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Voice recognition error:', event.error);
                this.showVoiceResponse(`Error: ${event.error}`, 'error');
                this.updateVoiceUI(false);
            };

            this.recognition.onend = () => {
                console.log('Voice recognition ended');
                this.updateVoiceUI(false);
            };
        } else {
            console.warn('Speech recognition not supported');
            this.showVoiceResponse('Speech recognition not supported in this browser', 'warning');
        }
    }

    switchToPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Hide all pages
        document.querySelectorAll('.page-content').forEach(pageEl => {
            pageEl.classList.add('hidden');
        });

        // Show selected page
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            targetPage.classList.add('fade-in');
            this.currentPage = page;

            // Load page-specific data
            this.loadPageData(page);
        }
    }

    loadPageData(page) {
        switch (page) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'voice':
                this.loadVoicePage();
                break;
            case 'tickets':
                this.loadTicketsPage();
                this.renderTickets();
                break;
            case 'events':
                this.loadEventsPage();
                this.renderEvents();
                break;
            case 'feedback':
                this.loadFeedbackPage();
                this.renderFeedback();
                break;
            case 'analytics':
                if (this.user.role === 'admin') {
                    this.renderAnalytics();
                }
                break;
        }
    }

    // Voice Recognition Methods
    startVoiceListening() {
        if (this.recognition && !this.isListening) {
            this.recognition.start();
            this.isListening = true;
            this.analytics.voiceInteractions++;
        }
    }

    stopVoiceListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    }

    updateVoiceUI(listening) {
        const startBtn = document.getElementById('start-listening');
        const stopBtn = document.getElementById('stop-listening');
        const waveform = document.getElementById('voice-waveform');

        if (listening) {
            startBtn?.classList.add('hidden');
            stopBtn?.classList.remove('hidden');
            waveform?.classList.remove('hidden');
            startBtn?.classList.add('listening');
        } else {
            startBtn?.classList.remove('hidden');
            stopBtn?.classList.add('hidden');
            waveform?.classList.add('hidden');
            startBtn?.classList.remove('listening');
        }
        
        this.isListening = listening;
    }

    displayTranscript(final, interim) {
        const transcriptEl = document.getElementById('voice-transcript');
        if (transcriptEl) {
            transcriptEl.innerHTML = `
                <div class="alert alert-info">
                    <strong>You said:</strong> ${final}
                    ${interim ? `<br><em class="text-muted">${interim}</em>` : ''}
                </div>
            `;
        }
    }

    showVoiceResponse(message, type = 'success') {
        const responseEl = document.getElementById('voice-response');
        if (responseEl) {
            const alertClass = type === 'error' ? 'alert-danger' : 
                             type === 'warning' ? 'alert-warning' : 'alert-success';
            
            responseEl.innerHTML = `
                <div class="alert ${alertClass}">
                    <strong>Assistant:</strong> ${message}
                </div>
            `;
        }
    }

    async processVoiceCommand(transcript) {
        const command = transcript.toLowerCase().trim();
        console.log('Processing command:', command);

        try {
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('resivox_token')}`
                },
                body: JSON.stringify({
                    voiceInput: transcript,
                    context: {
                        location: this.user.unitNumber,
                        currentPage: this.currentPage
                    }
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showVoiceResponse(data.response);
                
                // Handle specific actions
                if (data.action === 'create_ticket' && data.data.ticket) {
                    this.tickets.unshift(data.data.ticket);
                    this.analytics.totalTickets++;
                    
                    // Update UI if on tickets page
                    if (this.currentPage === 'tickets') {
                        this.renderTickets();
                    }
                    this.updateDashboardStats();
                    
                    // Also refresh from server to ensure consistency
                    await this.loadTickets();
                }
                
                if (data.action === 'event_feedback' && data.data.feedback) {
                    this.feedback.unshift(data.data.feedback);
                    
                    // Update UI if on feedback page
                    if (this.currentPage === 'feedback') {
                        this.renderFeedback();
                    }
                    this.updateAnalytics();
                }
            } else {
                this.showVoiceResponse(data.message || 'Sorry, I encountered an error processing your request.', 'error');
            }
        } catch (error) {
            console.error('Error processing voice command:', error);
            this.showVoiceResponse('Sorry, I encountered a network error. Please try again.', 'error');
        }
    }

    // Data Loading Methods
    loadDashboardData() {
        console.log('Loading dashboard data for role:', this.user.role);
        
        if (this.user.role === 'resident') {
            this.setupResidentDashboardContent();
        } else if (this.user.role === 'admin') {
            this.setupAdminDashboardContent();
        }
        this.updateDashboardStats();
    }

    updateDashboardStats() {
        // Update stats with null checks
        const totalTicketsEl = document.getElementById('total-tickets');
        const activeEventsEl = document.getElementById('active-events');
        const voiceInteractionsEl = document.getElementById('voice-interactions');
        const satisfactionRateEl = document.getElementById('satisfaction-rate');
        
        if (totalTicketsEl) totalTicketsEl.textContent = this.analytics.totalTickets || 0;
        if (activeEventsEl) activeEventsEl.textContent = this.analytics.activeEvents || 0;
        if (voiceInteractionsEl) voiceInteractionsEl.textContent = this.analytics.voiceInteractions || 0;
        if (satisfactionRateEl) satisfactionRateEl.textContent = `${this.analytics.satisfactionRate || 0}%`;
        
        console.log('Dashboard stats updated:', this.analytics);
    }

    async loadTickets() {
        console.log('Loading tickets from API...');
        try {
            const token = localStorage.getItem('resivox_token');
            console.log('Token exists:', !!token);
            
            if (!token) {
                console.error('No authentication token found');
                this.loadSampleTickets();
                return;
            }

            const response = await fetch('/api/tickets', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Tickets API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Tickets API response data:', data);
                this.tickets = data.tickets || [];
                this.analytics.totalTickets = data.stats?.total || this.tickets.length;
                console.log('Tickets loaded from API:', this.tickets.length, 'tickets');
                console.log('Tickets data:', this.tickets);
            } else {
                const errorData = await response.text();
                console.error('Failed to load tickets from API:', response.status, errorData);
                this.loadSampleTickets(); // Fallback to sample data
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            this.loadSampleTickets(); // Fallback to sample data
        }
    }

    loadSampleTickets() {
        // Sample tickets for demo/fallback
        console.log('Loading sample tickets for role:', this.user.role);
        
        if (this.tickets.length === 0) {
            if (this.user.role === 'admin') {
                // Admin sees all tickets
                this.tickets = [
                    {
                        id: '1001',
                        title: 'Water Leak',
                        description: 'Kitchen faucet is leaking in unit 205',
                        priority: 'P2',
                        status: 'In Progress',
                        location: 'Unit 205',
                        userId: 2,
                        createdAt: new Date(Date.now() - 86400000).toISOString(),
                        technician: 'John Smith',
                        source: 'Voice'
                    },
                    {
                        id: '1002',
                        title: 'Electrical Issue',
                        description: 'Lights flickering in hallway',
                        priority: 'P3',
                        status: 'Assigned',
                        location: 'Floor 3 Hallway',
                        userId: 3,
                        createdAt: new Date(Date.now() - 172800000).toISOString(),
                        technician: 'Mike Johnson',
                        source: 'Phone'
                    },
                    {
                        id: '1003',
                        title: 'AC Not Working',
                        description: 'Air conditioning unit not cooling properly',
                        priority: 'P2',
                        status: 'Open',
                        location: 'Unit 301',
                        userId: 4,
                        createdAt: new Date(Date.now() - 43200000).toISOString(),
                        technician: null,
                        source: 'Voice'
                    }
                ];
            } else {
                // Residents see only their tickets
                this.tickets = [
                    {
                        id: '1001',
                        title: 'Water Leak',
                        description: 'Kitchen faucet is leaking in my unit',
                        priority: 'P2',
                        status: 'In Progress',
                        location: this.user.unitNumber || 'Unit 205',
                        userId: this.user.id,
                        createdAt: new Date(Date.now() - 86400000).toISOString(),
                        technician: 'John Smith',
                        source: 'Voice'
                    }
                ];
            }
            this.analytics.totalTickets = this.tickets.length;
            console.log('Sample tickets loaded:', this.tickets.length);
        }
    }

    renderTickets() {
        console.log('=== RENDER TICKETS DEBUG ===');
        console.log('Current tickets array:', this.tickets);
        console.log('Tickets count:', this.tickets.length);
        console.log('Current user:', this.user);
        console.log('Current page:', this.currentPage);
        
        const ticketsList = document.getElementById('tickets-list');
        console.log('Tickets list container found:', !!ticketsList);
        
        if (!ticketsList) {
            console.error('Tickets list container not found');
            return;
        }

        if (this.tickets.length === 0) {
            console.log('No tickets found, showing empty state');
            ticketsList.innerHTML = `
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-ticket-alt fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No Tickets Found</h5>
                        <p class="text-muted">You haven't created any tickets yet. Use the Voice Assistant to report issues.</p>
                        <button class="btn btn-primary" onclick="app.switchToPage('voice')">
                            <i class="fas fa-microphone me-2"></i>
                            Report an Issue
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Filter tickets based on search and filter
        let filteredTickets = this.tickets;
        
        const searchTerm = document.getElementById('ticket-search')?.value?.toLowerCase() || '';
        const statusFilter = document.getElementById('ticket-filter')?.value || '';
        
        console.log('Search term:', searchTerm);
        console.log('Status filter:', statusFilter);
        
        if (searchTerm) {
            filteredTickets = filteredTickets.filter(ticket => 
                ticket.title.toLowerCase().includes(searchTerm) ||
                ticket.description.toLowerCase().includes(searchTerm) ||
                ticket.id.includes(searchTerm)
            );
        }
        
        if (statusFilter) {
            filteredTickets = filteredTickets.filter(ticket => ticket.status === statusFilter);
        }

        console.log('Filtered tickets:', filteredTickets);

        // Render tickets
        ticketsList.innerHTML = filteredTickets.map(ticket => {
            const priorityClass = {
                'P1': 'danger',
                'P2': 'warning', 
                'P3': 'info',
                'P4': 'secondary'
            }[ticket.priority] || 'secondary';
            
            const statusClass = {
                'Open': 'primary',
                'Assigned': 'info',
                'In Progress': 'warning',
                'Resolved': 'success'
            }[ticket.status] || 'secondary';
            
            const createdDate = new Date(ticket.createdAt).toLocaleDateString();
            const createdTime = new Date(ticket.createdAt).toLocaleTimeString();
            
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <div class="d-flex align-items-center mb-2">
                                    <h5 class="card-title mb-0 me-3">
                                        <i class="fas fa-ticket-alt me-2"></i>
                                        #${ticket.id} - ${ticket.title}
                                    </h5>
                                    <span class="badge bg-${priorityClass} me-2">${ticket.priority}</span>
                                    <span class="badge bg-${statusClass}">${ticket.status}</span>
                                </div>
                                <p class="card-text text-muted mb-2">${ticket.description}</p>
                                <div class="row text-sm">
                                    <div class="col-md-6">
                                        <small class="text-muted">
                                            <i class="fas fa-map-marker-alt me-1"></i>
                                            ${ticket.location}
                                        </small>
                                    </div>
                                    <div class="col-md-6">
                                        <small class="text-muted">
                                            <i class="fas fa-calendar me-1"></i>
                                            ${createdDate} at ${createdTime}
                                        </small>
                                    </div>
                                </div>
                                ${ticket.technician ? `
                                    <div class="mt-2">
                                        <small class="text-success">
                                            <i class="fas fa-user-cog me-1"></i>
                                            Assigned to: ${ticket.technician}
                                        </small>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="mb-2">
                                    <small class="text-muted">
                                        <i class="fas fa-${ticket.source === 'Voice' ? 'microphone' : 'phone'} me-1"></i>
                                        ${ticket.source}
                                    </small>
                                </div>
                                ${this.user.role === 'resident' ? `
                                    <button class="btn btn-outline-primary btn-sm" onclick="app.checkTicketStatus('${ticket.id}')">
                                        <i class="fas fa-info-circle me-1"></i>
                                        Check Status
                                    </button>
                                ` : `
                                    <div class="btn-group-vertical" role="group">
                                        <button class="btn btn-outline-info btn-sm mb-1" onclick="app.updateTicketStatus('${ticket.id}', 'Assigned')">
                                            Assign
                                        </button>
                                        <button class="btn btn-outline-warning btn-sm mb-1" onclick="app.updateTicketStatus('${ticket.id}', 'In Progress')">
                                            In Progress
                                        </button>
                                        <button class="btn btn-outline-success btn-sm" onclick="app.updateTicketStatus('${ticket.id}', 'Resolved')">
                                            Resolve
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('Tickets rendered successfully:', filteredTickets.length, 'tickets displayed');
        console.log('=== END RENDER TICKETS DEBUG ===');
    }

    async loadEvents() {
        console.log('Loading events from API...');
        try {
            const token = localStorage.getItem('resivox_token');
            console.log('Token exists:', !!token);
            
            if (!token) {
                console.error('No authentication token found');
                this.loadSampleEvents();
                return;
            }

            const response = await fetch('/api/events', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Events API response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Events API response data:', data);
                this.events = data.events || [];
                this.analytics.activeEvents = data.analytics?.totalEvents || this.events.length;
                console.log('Events loaded from API:', this.events.length, 'events');
                console.log('Events data:', this.events);
            } else {
                const errorData = await response.text();
                console.error('Failed to load events from API:', response.status, errorData);
                this.loadSampleEvents(); // Fallback to sample data
            }
        } catch (error) {
            console.error('Error loading events:', error);
            this.loadSampleEvents(); // Fallback to sample data
        }
    }

    loadSampleEvents() {
        console.log('Loading sample events');
        
        if (this.events.length === 0) {
            this.events = [
                {
                    id: '1',
                    title: 'Community BBQ',
                    description: 'Join us for a fun BBQ event at the terrace',
                    date: new Date(Date.now() + 604800000).toISOString(),
                    location: 'Terrace',
                    status: 'Planned'
                },
                {
                    id: '2',
                    title: 'Yoga Session',
                    description: 'Morning yoga in the garden',
                    date: new Date(Date.now() + 259200000).toISOString(),
                    location: 'Garden',
                    status: 'Active'
                },
                {
                    id: '3',
                    title: 'Movie Night',
                    description: 'Outdoor movie screening under the stars',
                    date: new Date(Date.now() + 432000000).toISOString(),
                    location: 'Garden',
                    status: 'Planned'
                }
            ];
            this.analytics.activeEvents = this.events.filter(e => e.status === 'Active').length;
            console.log('Sample events loaded:', this.events.length);
        }
    }

    renderEvents() {
        console.log('=== RENDER EVENTS DEBUG ===');
        console.log('Current events array:', this.events);
        console.log('Events count:', this.events.length);
        console.log('Current user role:', this.user.role);
        
        if (this.user.role === 'resident') {
            this.renderResidentEvents();
        } else if (this.user.role === 'admin') {
            this.renderAdminEvents();
        }
        
        console.log('=== END RENDER EVENTS DEBUG ===');
    }

    renderResidentEvents() {
        const eventsContainer = document.getElementById('resident-events-list');
        if (!eventsContainer) {
            console.error('Resident events container not found');
            return;
        }

        // Filter upcoming events
        const upcomingEvents = this.events.filter(event => 
            new Date(event.date) > new Date()
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log('Upcoming events for residents:', upcomingEvents);

        if (upcomingEvents.length === 0) {
            eventsContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No Upcoming Events</h5>
                    <p class="text-muted">Check back later for new community events!</p>
                </div>
            `;
            return;
        }

        eventsContainer.innerHTML = `
            <div class="row">
                ${upcomingEvents.map(event => {
                    const eventDate = new Date(event.date);
                    const isToday = eventDate.toDateString() === new Date().toDateString();
                    const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                    
                    let dateText = eventDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    if (isToday) dateText = 'Today';
                    else if (isTomorrow) dateText = 'Tomorrow';
                    
                    const timeText = eventDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    });

                    const categoryColors = {
                        'Food & Social': 'success',
                        'Fitness': 'info',
                        'Entertainment': 'warning',
                        'Cultural': 'primary',
                        'Community': 'secondary'
                    };
                    
                    const colorClass = categoryColors[event.category] || 'primary';
                    
                    return `
                        <div class="col-md-6 mb-3">
                            <div class="card border-${colorClass}">
                                <div class="card-body">
                                    <h6 class="card-title text-${colorClass}">
                                        <i class="fas fa-calendar-alt me-2"></i>
                                        ${event.title}
                                    </h6>
                                    <p class="card-text">${event.description}</p>
                                    <div class="mb-3">
                                        <small class="text-muted">
                                            <i class="fas fa-clock me-1"></i>${dateText}, ${timeText}<br>
                                            <i class="fas fa-map-marker-alt me-1"></i>${event.location}<br>
                                            <i class="fas fa-users me-1"></i>Expected: ${event.estimatedAttendance} residents
                                        </small>
                                    </div>
                                    <div class="mt-2">
                                        <button class="btn btn-${colorClass} btn-sm me-2" onclick="app.attendEvent('${event.id}')">
                                            <i class="fas fa-check me-1"></i>
                                            I'm Attending
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm" onclick="app.maybeAttendEvent('${event.id}')">
                                            <i class="fas fa-question me-1"></i>
                                            Maybe
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderAdminEvents() {
        // Admin events are already rendered in the loadEventsPage method
        console.log('Admin events rendered in loadEventsPage');
    }

    // Event attendance methods
    attendEvent(eventId) {
        console.log('User attending event:', eventId);
        alert('Great! You\'re marked as attending this event. We\'ll send you a reminder!');
        // In a real app, this would update the attendance in the database
    }

    maybeAttendEvent(eventId) {
        console.log('User maybe attending event:', eventId);
        alert('Thanks! We\'ve noted your interest. We\'ll send you updates about this event.');
        // In a real app, this would update the maybe list in the database
    }

    loadFeedback() {
        if (this.feedback.length === 0) {
            this.feedback = [
                {
                    id: '1',
                    text: 'The BBQ event was amazing! Great food and company.',
                    rating: 5,
                    sentiment: 'positive',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    source: 'Voice'
                },
                {
                    id: '2',
                    text: 'Yoga session was peaceful and well-organized.',
                    rating: 4,
                    sentiment: 'positive',
                    createdAt: new Date(Date.now() - 172800000).toISOString(),
                    source: 'Survey'
                }
            ];
        }
    }

    renderFeedback() {
        // Feedback rendering logic would go here
        console.log('Rendering feedback page');
    }

    renderAnalytics() {
        console.log('Rendering analytics page');
        
        const analyticsPage = document.getElementById('analytics-page');
        if (analyticsPage && this.user.role === 'admin') {
            analyticsPage.innerHTML = `
                <h1 class="page-title">
                    <i class="fas fa-chart-bar me-2"></i>
                    Analytics & Reports
                </h1>
                <p class="page-subtitle">Comprehensive insights into community operations and resident satisfaction</p>

                <!-- Key Performance Indicators -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card text-center border-primary">
                            <div class="card-body">
                                <i class="fas fa-ticket-alt fa-2x text-primary mb-2"></i>
                                <h3 class="text-primary">${this.analytics.totalTickets}</h3>
                                <p class="card-text">Total Tickets</p>
                                <small class="text-success">+12% this month</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center border-success">
                            <div class="card-body">
                                <i class="fas fa-clock fa-2x text-success mb-2"></i>
                                <h3 class="text-success">2.3h</h3>
                                <p class="card-text">Avg Resolution Time</p>
                                <small class="text-success">-15% improvement</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center border-warning">
                            <div class="card-body">
                                <i class="fas fa-users fa-2x text-warning mb-2"></i>
                                <h3 class="text-warning">78%</h3>
                                <p class="card-text">Event Participation</p>
                                <small class="text-warning">+5% this month</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center border-info">
                            <div class="card-body">
                                <i class="fas fa-star fa-2x text-info mb-2"></i>
                                <h3 class="text-info">${this.analytics.satisfactionRate}%</h3>
                                <p class="card-text">Satisfaction Rate</p>
                                <small class="text-info">+3% this month</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Charts and Detailed Analytics -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-chart-line me-2"></i>
                                    Ticket Trends (Last 30 Days)
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="chart-placeholder bg-light p-4 text-center">
                                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                                    <p class="text-muted">Interactive chart showing ticket volume, resolution times, and priority distribution over time</p>
                                    <div class="row text-center mt-3">
                                        <div class="col-4">
                                            <strong class="text-danger">P1: 5%</strong><br>
                                            <small>Critical</small>
                                        </div>
                                        <div class="col-4">
                                            <strong class="text-warning">P2: 25%</strong><br>
                                            <small>High</small>
                                        </div>
                                        <div class="col-4">
                                            <strong class="text-info">P3: 70%</strong><br>
                                            <small>Medium/Low</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-chart-pie me-2"></i>
                                    Issue Categories
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="chart-placeholder bg-light p-4 text-center">
                                    <i class="fas fa-chart-pie fa-3x text-muted mb-3"></i>
                                    <p class="text-muted">Distribution of maintenance issues by category</p>
                                    <div class="row text-center mt-3">
                                        <div class="col-6">
                                            <strong class="text-primary">Plumbing: 35%</strong><br>
                                            <small>Most common</small>
                                        </div>
                                        <div class="col-6">
                                            <strong class="text-success">Electrical: 25%</strong><br>
                                            <small>Second most</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Reports -->
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-wrench me-2"></i>
                                    Technician Performance
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>John Smith (Plumbing)</span>
                                        <span class="badge bg-success">4.8★</span>
                                    </div>
                                    <div class="progress mt-1">
                                        <div class="progress-bar bg-success" style="width: 96%"></div>
                                    </div>
                                    <small class="text-muted">12 tickets resolved</small>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Mike Johnson (Electrical)</span>
                                        <span class="badge bg-success">4.6★</span>
                                    </div>
                                    <div class="progress mt-1">
                                        <div class="progress-bar bg-success" style="width: 92%"></div>
                                    </div>
                                    <small class="text-muted">8 tickets resolved</small>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Sarah Wilson (Internet)</span>
                                        <span class="badge bg-warning">4.2★</span>
                                    </div>
                                    <div class="progress mt-1">
                                        <div class="progress-bar bg-warning" style="width: 84%"></div>
                                    </div>
                                    <small class="text-muted">6 tickets resolved</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-calendar-check me-2"></i>
                                    Event Success Metrics
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Community BBQ</span>
                                        <span class="badge bg-success">95% attendance</span>
                                    </div>
                                    <div class="progress mt-1">
                                        <div class="progress-bar bg-success" style="width: 95%"></div>
                                    </div>
                                    <small class="text-muted">4.9★ average rating</small>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Yoga Session</span>
                                        <span class="badge bg-success">78% attendance</span>
                                    </div>
                                    <div class="progress mt-1">
                                        <div class="progress-bar bg-success" style="width: 78%"></div>
                                    </div>
                                    <small class="text-muted">4.7★ average rating</small>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between">
                                        <span>Movie Night</span>
                                        <span class="badge bg-warning">65% attendance</span>
                                    </div>
                                    <div class="progress mt-1">
                                        <div class="progress-bar bg-warning" style="width: 65%"></div>
                                    </div>
                                    <small class="text-muted">4.3★ average rating</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-microphone me-2"></i>
                                    Voice Assistant Usage
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="text-center mb-3">
                                    <h3 class="text-primary">${this.analytics.voiceInteractions}</h3>
                                    <p class="text-muted">Total Voice Interactions</p>
                                </div>
                                <div class="mb-2">
                                    <div class="d-flex justify-content-between">
                                        <span>Ticket Creation</span>
                                        <span>65%</span>
                                    </div>
                                    <div class="progress">
                                        <div class="progress-bar bg-primary" style="width: 65%"></div>
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <div class="d-flex justify-content-between">
                                        <span>Status Inquiries</span>
                                        <span>25%</span>
                                    </div>
                                    <div class="progress">
                                        <div class="progress-bar bg-info" style="width: 25%"></div>
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <div class="d-flex justify-content-between">
                                        <span>Event Feedback</span>
                                        <span>10%</span>
                                    </div>
                                    <div class="progress">
                                        <div class="progress-bar bg-success" style="width: 10%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Export and Actions -->
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-download me-2"></i>
                                    Export Reports
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-3">
                                        <button class="btn btn-outline-primary w-100 mb-2" onclick="app.exportReport('tickets')">
                                            <i class="fas fa-file-csv me-2"></i>
                                            Tickets Report
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-outline-success w-100 mb-2" onclick="app.exportReport('events')">
                                            <i class="fas fa-file-excel me-2"></i>
                                            Events Report
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-outline-info w-100 mb-2" onclick="app.exportReport('feedback')">
                                            <i class="fas fa-file-pdf me-2"></i>
                                            Feedback Report
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-outline-warning w-100 mb-2" onclick="app.exportReport('comprehensive')">
                                            <i class="fas fa-file-archive me-2"></i>
                                            Full Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    exportReport(type) {
        console.log('Exporting report:', type);
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} report exported successfully!`);
        // In a real app, this would generate and download the report
    }

    updateAnalytics() {
        console.log('Updating analytics');
        
        // Calculate satisfaction rate
        const ratedFeedback = this.feedback.filter(f => f.rating);
        if (ratedFeedback.length > 0) {
            const avgRating = ratedFeedback.reduce((sum, f) => sum + f.rating, 0) / ratedFeedback.length;
            this.analytics.satisfactionRate = Math.round((avgRating / 5) * 100);
        } else {
            this.analytics.satisfactionRate = 85; // Default value
        }
        
        // Set some default values for demo
        this.analytics.voiceInteractions = this.analytics.voiceInteractions || 12;
        this.analytics.totalTickets = this.tickets.length;
        this.analytics.activeEvents = this.events.filter(e => e.status === 'Active').length;
    }

    // Additional methods for page loading
    loadVoicePage() {
        const voicePage = document.getElementById('voice-page');
        if (voicePage) {
            voicePage.innerHTML = `
                <h1 class="page-title">
                    <i class="fas fa-microphone me-2"></i>
                    ${this.user.role === 'resident' ? 'Voice Assistant' : 'Voice Commands'}
                </h1>
                <p class="page-subtitle">
                    ${this.user.role === 'resident' 
                        ? 'Report issues, check tickets, and give feedback using your voice'
                        : 'Monitor voice interactions and assist residents'
                    }
                </p>

                <!-- Voice Input Card -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card voice-input-card">
                            <div class="card-body text-center">
                                <h3 class="mb-3">
                                    <i class="fas fa-microphone me-2"></i>
                                    Voice Command Center
                                </h3>
                                <p class="mb-4">Click the button below and speak naturally</p>
                                
                                <div class="mb-4">
                                    <button id="start-listening" class="voice-btn" onclick="app.startVoiceListening()">
                                        <i class="fas fa-microphone me-2"></i>
                                        Start Speaking
                                    </button>
                                    <button id="stop-listening" class="voice-btn hidden" onclick="app.stopVoiceListening()">
                                        <i class="fas fa-stop me-2"></i>
                                        Stop Listening
                                    </button>
                                </div>

                                <!-- Voice Waveform Animation -->
                                <div id="voice-waveform" class="voice-waveform hidden">
                                    <div class="wave-bar"></div>
                                    <div class="wave-bar"></div>
                                    <div class="wave-bar"></div>
                                    <div class="wave-bar"></div>
                                    <div class="wave-bar"></div>
                                </div>

                                <!-- Example Commands -->
                                <div class="row text-start mt-4">
                                    <div class="col-md-4">
                                        <h6><i class="fas fa-exclamation-triangle me-2"></i>Report Issues</h6>
                                        <small>"My kitchen faucet is leaking in unit ${this.user.unitNumber || '205'}"</small>
                                    </div>
                                    <div class="col-md-4">
                                        <h6><i class="fas fa-search me-2"></i>Check Status</h6>
                                        <small>"What's the status of ticket 1234?"</small>
                                    </div>
                                    <div class="col-md-4">
                                        <h6><i class="fas fa-star me-2"></i>Give Feedback</h6>
                                        <small>"The BBQ event was amazing, 5 stars!"</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Transcript Display -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">
                                    <i class="fas fa-quote-left me-2"></i>
                                    What You Said
                                </h5>
                                <div id="voice-transcript">
                                    <div class="alert alert-light">
                                        <em class="text-muted">Your voice input will appear here...</em>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Response Display -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">
                                    <i class="fas fa-robot me-2"></i>
                                    Assistant Response
                                </h5>
                                <div id="voice-response">
                                    <div class="alert alert-light">
                                        <em class="text-muted">Assistant responses will appear here...</em>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">
                                    <i class="fas fa-bolt me-2"></i>
                                    Quick Actions
                                </h5>
                                <div class="row">
                                    <div class="col-md-3">
                                        <button class="btn btn-primary w-100 mb-2" onclick="app.processVoiceCommand('Create a maintenance ticket for my unit')">
                                            <i class="fas fa-wrench me-2"></i>
                                            Report Issue
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-info w-100 mb-2" onclick="app.processVoiceCommand('Show me my tickets')">
                                            <i class="fas fa-list me-2"></i>
                                            Check Tickets
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-success w-100 mb-2" onclick="app.processVoiceCommand('Show upcoming events')">
                                            <i class="fas fa-calendar me-2"></i>
                                            View Events
                                        </button>
                                    </div>
                                    <div class="col-md-3">
                                        <button class="btn btn-warning w-100 mb-2" onclick="app.processVoiceCommand('I want to give feedback')">
                                            <i class="fas fa-star me-2"></i>
                                            Give Feedback
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Voice Tips -->
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">
                                    <i class="fas fa-lightbulb me-2"></i>
                                    Voice Tips
                                </h5>
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>✅ Good Examples:</h6>
                                        <ul class="list-unstyled">
                                            <li>• "My toilet is clogged in unit ${this.user.unitNumber || '205'}"</li>
                                            <li>• "The elevator is making noise"</li>
                                            <li>• "Rate the movie night event 5 stars"</li>
                                            <li>• "What's the status of my ticket?"</li>
                                        </ul>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>💡 Tips for Better Recognition:</h6>
                                        <ul class="list-unstyled">
                                            <li>• Speak clearly and at normal pace</li>
                                            <li>• Include your unit number when reporting issues</li>
                                            <li>• Be specific about the problem</li>
                                            <li>• Use simple, direct language</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    loadTicketsPage() {
        const ticketsPage = document.getElementById('tickets-page');
        if (ticketsPage) {
            ticketsPage.innerHTML = `
                <h1 class="page-title">
                    <i class="fas fa-ticket-alt me-2"></i>
                    ${this.user.role === 'resident' ? 'My Tickets' : 'Ticket Management'}
                </h1>
                <p class="page-subtitle">
                    ${this.user.role === 'resident' 
                        ? 'Track your service requests and complaints'
                        : 'Manage all resident complaints and service requests'
                    }
                </p>

                <!-- Search and Filter -->
                <div class="row mb-3">
                    <div class="col-md-4">
                        <div class="input-group">
                            <span class="input-group-text"><i class="fas fa-search"></i></span>
                            <input type="text" class="form-control" placeholder="Search tickets..." id="ticket-search">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <select class="form-select" id="ticket-filter">
                            <option value="">All Tickets</option>
                            <option value="Open">Open</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <button class="btn btn-outline-primary" onclick="app.refreshTickets()">
                            <i class="fas fa-sync-alt me-2"></i>
                            Refresh
                        </button>
                        ${this.user.role === 'resident' ? `
                            <button class="btn btn-primary ms-2" onclick="app.switchToPage('voice')">
                                <i class="fas fa-plus me-2"></i>
                                New Ticket
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Tickets List -->
                <div id="tickets-list">
                    <!-- Tickets will be loaded here -->
                </div>
            `;
        }
    }

    loadEventsPage() {
        const eventsPage = document.getElementById('events-page');
        if (eventsPage) {
            eventsPage.innerHTML = `
                <h1 class="page-title">
                    <i class="fas fa-calendar-alt me-2"></i>
                    ${this.user.role === 'resident' ? 'Event Notifications' : 'Event Management'}
                </h1>
                <p class="page-subtitle">
                    ${this.user.role === 'resident' 
                        ? 'Stay updated on community events and activities'
                        : 'Create, manage and promote community events'
                    }
                </p>

                ${this.user.role === 'admin' ? `
                    <!-- Admin Event Management -->
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card border-warning">
                                <div class="card-body text-center">
                                    <h5 class="card-title">
                                        <i class="fas fa-lightbulb text-warning me-2"></i>
                                        AI Event Suggestions
                                    </h5>
                                    <p class="text-muted">Get personalized event recommendations based on resident feedback and trends</p>
                                    <button class="btn btn-warning" onclick="app.getEventRecommendations()">
                                        <i class="fas fa-magic me-2"></i>
                                        Generate Suggestions
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card border-info">
                                <div class="card-body text-center">
                                    <h5 class="card-title">
                                        <i class="fas fa-bullhorn text-info me-2"></i>
                                        Event Promotion
                                    </h5>
                                    <p class="text-muted">Create and distribute promotional materials for upcoming events</p>
                                    <button class="btn btn-info" onclick="app.generatePromotions()">
                                        <i class="fas fa-share-alt me-2"></i>
                                        Create Promotions
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card border-success">
                                <div class="card-body text-center">
                                    <h5 class="card-title">
                                        <i class="fas fa-plus text-success me-2"></i>
                                        Create New Event
                                    </h5>
                                    <p class="text-muted">Schedule a new community event or activity</p>
                                    <button class="btn btn-success" onclick="app.createNewEvent()">
                                        <i class="fas fa-calendar-plus me-2"></i>
                                        New Event
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Event Suggestions Results -->
                    <div id="event-recommendations" class="mb-4"></div>
                    
                    <!-- Event Promotions Results -->
                    <div id="event-promotions" class="mb-4"></div>

                    <!-- Current Events Management -->
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="fas fa-calendar-alt me-2"></i>
                                        Event Management Dashboard
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div class="row">
                                        <div class="col-md-3 text-center">
                                            <h4 class="text-primary">${this.events.length}</h4>
                                            <p class="text-muted">Total Events</p>
                                        </div>
                                        <div class="col-md-3 text-center">
                                            <h4 class="text-success">${this.events.filter(e => e.status === 'Active').length}</h4>
                                            <p class="text-muted">Active Events</p>
                                        </div>
                                        <div class="col-md-3 text-center">
                                            <h4 class="text-warning">${this.events.filter(e => e.status === 'Planned').length}</h4>
                                            <p class="text-muted">Planned Events</p>
                                        </div>
                                        <div class="col-md-3 text-center">
                                            <h4 class="text-info">85%</h4>
                                            <p class="text-muted">Attendance Rate</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : `
                    <!-- Resident Event View -->
                    <div class="row">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">
                                        <i class="fas fa-calendar-plus text-primary me-2"></i>
                                        Upcoming Events
                                    </h5>
                                    <div id="resident-events-list">
                                        <!-- Events will be loaded here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `}
            `;
        }
    }

    loadFeedbackPage() {
        const feedbackPage = document.getElementById('feedback-page');
        if (feedbackPage) {
            feedbackPage.innerHTML = `
                <h1 class="page-title">
                    <i class="fas fa-comments me-2"></i>
                    ${this.user.role === 'resident' ? 'My Feedback & Ratings' : 'Feedback Analytics'}
                </h1>
                <p class="page-subtitle">
                    ${this.user.role === 'resident' 
                        ? 'Rate events and share your community experience'
                        : 'Analyze resident feedback and community sentiment'
                    }
                </p>

                <!-- Feedback Stats -->
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3 class="text-success" id="positive-feedback">12</h3>
                                <p class="card-text">Positive Feedback</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3 class="text-warning" id="neutral-feedback">3</h3>
                                <p class="card-text">Neutral Feedback</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-center">
                            <div class="card-body">
                                <h3 class="text-danger" id="negative-feedback">1</h3>
                                <p class="card-text">Negative Feedback</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Feedback List -->
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">
                                    <i class="fas fa-star me-2"></i>
                                    Recent Feedback
                                </h5>
                                <div id="feedback-list">
                                    <!-- Feedback items will be loaded here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                ${this.user.role === 'resident' ? `
                    <!-- Quick Feedback Form -->
                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">
                                        <i class="fas fa-plus me-2"></i>
                                        Quick Feedback
                                    </h5>
                                    <p class="text-muted">Share your thoughts about recent events or community services</p>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <button class="btn btn-success w-100 mb-2" onclick="app.rateEvent('last-event')">
                                                <i class="fas fa-thumbs-up me-2"></i>
                                                Rate Last Event
                                            </button>
                                        </div>
                                        <div class="col-md-6">
                                            <button class="btn btn-primary w-100 mb-2" onclick="app.switchToPage('voice')">
                                                <i class="fas fa-microphone me-2"></i>
                                                Voice Feedback
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
            `;
        }
    }

    setupResidentDashboardContent() {
        console.log('Setting up resident dashboard content');
    }

    setupAdminDashboardContent() {
        console.log('Setting up admin dashboard content');
        
        const dashboardPage = document.getElementById('dashboard-page');
        if (dashboardPage) {
            dashboardPage.innerHTML = `
                <!-- Admin Dashboard Header -->
                <div class="row mb-4">
                    <div class="col-12">
                        <h1 class="page-title">
                            <i class="fas fa-tachometer-alt me-2"></i>
                            Admin Dashboard
                        </h1>
                        <p class="page-subtitle">Monitor community operations and manage resident services</p>
                    </div>
                </div>

                <!-- Dashboard Alerts -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="card border-warning">
                            <div class="card-header bg-warning text-dark">
                                <h5 class="mb-0">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    Priority Alerts
                                </h5>
                            </div>
                            <div class="card-body" id="dashboard-alerts">
                                <!-- Alerts will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Key Metrics -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card text-center border-danger">
                            <div class="card-body">
                                <i class="fas fa-exclamation-circle fa-2x text-danger mb-2"></i>
                                <h3 class="text-danger" id="urgent-tickets">0</h3>
                                <p class="card-text">Urgent Tickets</p>
                                <button class="btn btn-outline-danger btn-sm" onclick="app.viewUrgentTickets()">
                                    View All
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center border-warning">
                            <div class="card-body">
                                <i class="fas fa-clock fa-2x text-warning mb-2"></i>
                                <h3 class="text-warning" id="pending-assignments">0</h3>
                                <p class="card-text">Pending Assignments</p>
                                <button class="btn btn-outline-warning btn-sm" onclick="app.viewPendingTickets()">
                                    Assign Now
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center border-info">
                            <div class="card-body">
                                <i class="fas fa-calendar-plus fa-2x text-info mb-2"></i>
                                <h3 class="text-info" id="event-suggestions">0</h3>
                                <p class="card-text">Event Suggestions</p>
                                <button class="btn btn-outline-info btn-sm" onclick="app.reviewEventSuggestions()">
                                    Review
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card text-center border-success">
                            <div class="card-body">
                                <i class="fas fa-star fa-2x text-success mb-2"></i>
                                <h3 class="text-success" id="satisfaction-rate">0%</h3>
                                <p class="card-text">Satisfaction Rate</p>
                                <button class="btn btn-outline-success btn-sm" onclick="app.viewFeedbackAnalytics()">
                                    Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-tasks me-2"></i>
                                    Quick Actions
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-6 mb-2">
                                        <button class="btn btn-primary w-100" onclick="app.switchToPage('tickets')">
                                            <i class="fas fa-ticket-alt me-2"></i>
                                            Manage Tickets
                                        </button>
                                    </div>
                                    <div class="col-6 mb-2">
                                        <button class="btn btn-info w-100" onclick="app.switchToPage('events')">
                                            <i class="fas fa-calendar me-2"></i>
                                            Event Management
                                        </button>
                                    </div>
                                    <div class="col-6 mb-2">
                                        <button class="btn btn-success w-100" onclick="app.switchToPage('feedback')">
                                            <i class="fas fa-chart-line me-2"></i>
                                            Feedback Analytics
                                        </button>
                                    </div>
                                    <div class="col-6 mb-2">
                                        <button class="btn btn-warning w-100" onclick="app.switchToPage('analytics')">
                                            <i class="fas fa-chart-bar me-2"></i>
                                            Reports
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-lightbulb me-2"></i>
                                    AI Suggestions
                                </h5>
                            </div>
                            <div class="card-body" id="ai-suggestions">
                                <!-- AI suggestions will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="row">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-history me-2"></i>
                                    Recent Tickets
                                </h5>
                            </div>
                            <div class="card-body" id="recent-tickets">
                                <!-- Recent tickets will be loaded here -->
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-comments me-2"></i>
                                    Recent Feedback
                                </h5>
                            </div>
                            <div class="card-body" id="recent-feedback">
                                <!-- Recent feedback will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Load dashboard data
            this.loadAdminDashboardData();
        }
    }

    filterTickets() {
        console.log('Filtering tickets');
        this.renderTickets(); // Re-render with current filters
    }

    // Helper method to check ticket status via voice
    async checkTicketStatus(ticketId) {
        const command = `Check status of ticket ${ticketId}`;
        await this.processVoiceCommand(command);
    }

    // Helper method to update ticket status (admin only)
    async updateTicketStatus(ticketId, newStatus) {
        if (this.user.role !== 'admin') {
            this.showVoiceResponse('Only administrators can update ticket status', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/tickets/${ticketId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('resivox_token')}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (data.success) {
                // Update local ticket data
                const ticketIndex = this.tickets.findIndex(t => t.id === ticketId);
                if (ticketIndex !== -1) {
                    this.tickets[ticketIndex].status = newStatus;
                    this.renderTickets(); // Re-render to show updated status
                }
                
                this.showVoiceResponse(data.message || `Ticket #${ticketId} status updated to ${newStatus}`, 'success');
                
                // Refresh dashboard if we're on it
                if (this.currentPage === 'dashboard') {
                    this.loadAdminDashboardData();
                }
            } else {
                this.showVoiceResponse(data.message || 'Failed to update ticket status', 'error');
            }
        } catch (error) {
            console.error('Error updating ticket status:', error);
            this.showVoiceResponse('Network error while updating ticket status', 'error');
        }
    }

    // Admin Dashboard Methods
    loadAdminDashboardData() {
        console.log('Loading admin dashboard data...');
        this.loadDashboardAlerts();
        this.loadAISuggestions();
        this.loadRecentActivity();
        this.updateAdminMetrics();
    }

    loadDashboardAlerts() {
        const alertsContainer = document.getElementById('dashboard-alerts');
        if (!alertsContainer) return;

        // Generate alerts based on current data
        const alerts = [];
        
        // Check for urgent tickets
        const urgentTickets = this.tickets.filter(t => 
            ['P1', 'P2'].includes(t.priority) && t.status !== 'Resolved'
        );
        
        if (urgentTickets.length > 0) {
            alerts.push({
                type: 'danger',
                icon: 'fas fa-exclamation-triangle',
                message: `${urgentTickets.length} urgent tickets require immediate attention`,
                action: 'viewUrgentTickets'
            });
        }

        // Check for unassigned tickets
        const unassignedTickets = this.tickets.filter(t => t.status === 'Open');
        if (unassignedTickets.length > 0) {
            alerts.push({
                type: 'warning',
                icon: 'fas fa-user-plus',
                message: `${unassignedTickets.length} tickets need technician assignment`,
                action: 'viewPendingTickets'
            });
        }

        // Check satisfaction rate
        if (this.analytics.satisfactionRate < 70) {
            alerts.push({
                type: 'info',
                icon: 'fas fa-chart-line',
                message: `Satisfaction rate is ${this.analytics.satisfactionRate}% - consider reviewing feedback`,
                action: 'viewFeedbackAnalytics'
            });
        }

        if (alerts.length === 0) {
            alertsContainer.innerHTML = `
                <div class="alert alert-success mb-0">
                    <i class="fas fa-check-circle me-2"></i>
                    All systems operating normally. No urgent alerts at this time.
                </div>
            `;
        } else {
            alertsContainer.innerHTML = alerts.map(alert => `
                <div class="alert alert-${alert.type} mb-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="${alert.icon} me-2"></i>
                            ${alert.message}
                        </div>
                        <button class="btn btn-outline-${alert.type} btn-sm" onclick="app.${alert.action}()">
                            Take Action
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    loadAISuggestions() {
        const suggestionsContainer = document.getElementById('ai-suggestions');
        if (!suggestionsContainer) return;

        // Generate AI-like suggestions based on data patterns
        const suggestions = [];
        
        // Analyze ticket patterns
        const plumbingIssues = this.tickets.filter(t => t.issueType === 'Plumbing').length;
        const electricalIssues = this.tickets.filter(t => t.issueType === 'Electrical').length;
        
        if (plumbingIssues > electricalIssues * 2) {
            suggestions.push({
                icon: 'fas fa-wrench',
                text: 'Consider scheduling preventive plumbing maintenance',
                type: 'maintenance'
            });
        }

        // Event suggestions based on feedback
        const positiveEvents = this.feedback.filter(f => f.rating >= 4);
        if (positiveEvents.length > 0) {
            suggestions.push({
                icon: 'fas fa-calendar-plus',
                text: 'Residents loved recent events - schedule similar activities',
                type: 'event'
            });
        }

        // Default suggestions if no data-driven ones
        if (suggestions.length === 0) {
            suggestions.push(
                {
                    icon: 'fas fa-users',
                    text: 'Schedule community meeting to gather resident feedback',
                    type: 'community'
                },
                {
                    icon: 'fas fa-chart-bar',
                    text: 'Review monthly performance metrics',
                    type: 'analytics'
                }
            );
        }

        suggestionsContainer.innerHTML = suggestions.map(suggestion => `
            <div class="d-flex align-items-center mb-2">
                <i class="${suggestion.icon} text-primary me-3"></i>
                <span class="flex-grow-1">${suggestion.text}</span>
            </div>
        `).join('');
    }

    loadRecentActivity() {
        // Recent tickets
        const recentTicketsContainer = document.getElementById('recent-tickets');
        if (recentTicketsContainer) {
            const recentTickets = this.tickets
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);

            if (recentTickets.length === 0) {
                recentTicketsContainer.innerHTML = '<p class="text-muted">No recent tickets</p>';
            } else {
                recentTicketsContainer.innerHTML = recentTickets.map(ticket => `
                    <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                        <div>
                            <strong>#${ticket.id}</strong> - ${ticket.title}
                            <br><small class="text-muted">${ticket.location}</small>
                        </div>
                        <span class="badge bg-${this.getStatusClass(ticket.status)}">${ticket.status}</span>
                    </div>
                `).join('');
            }
        }

        // Recent feedback
        const recentFeedbackContainer = document.getElementById('recent-feedback');
        if (recentFeedbackContainer) {
            const recentFeedback = this.feedback
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);

            if (recentFeedback.length === 0) {
                recentFeedbackContainer.innerHTML = '<p class="text-muted">No recent feedback</p>';
            } else {
                recentFeedbackContainer.innerHTML = recentFeedback.map(feedback => `
                    <div class="mb-2 p-2 border rounded">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <div class="text-warning">
                                ${'★'.repeat(feedback.rating)}${'☆'.repeat(5 - feedback.rating)}
                            </div>
                            <small class="text-muted">${new Date(feedback.createdAt).toLocaleDateString()}</small>
                        </div>
                        <small>${feedback.text}</small>
                    </div>
                `).join('');
            }
        }
    }

    updateAdminMetrics() {
        // Update urgent tickets count
        const urgentTickets = this.tickets.filter(t => 
            ['P1', 'P2'].includes(t.priority) && t.status !== 'Resolved'
        ).length;
        const urgentElement = document.getElementById('urgent-tickets');
        if (urgentElement) urgentElement.textContent = urgentTickets;

        // Update pending assignments
        const pendingAssignments = this.tickets.filter(t => t.status === 'Open').length;
        const pendingElement = document.getElementById('pending-assignments');
        if (pendingElement) pendingElement.textContent = pendingAssignments;

        // Update event suggestions (mock data)
        const eventSuggestionsElement = document.getElementById('event-suggestions');
        if (eventSuggestionsElement) eventSuggestionsElement.textContent = '3';

        // Update satisfaction rate
        const satisfactionElement = document.getElementById('satisfaction-rate');
        if (satisfactionElement) satisfactionElement.textContent = `${this.analytics.satisfactionRate}%`;
    }

    getStatusClass(status) {
        const statusClasses = {
            'Open': 'primary',
            'Assigned': 'info',
            'In Progress': 'warning',
            'Resolved': 'success'
        };
        return statusClasses[status] || 'secondary';
    }

    // Admin workflow methods
    viewUrgentTickets() {
        this.switchToPage('tickets');
        // Set filter to show only urgent tickets
        setTimeout(() => {
            const filterElement = document.getElementById('ticket-filter');
            if (filterElement) {
                filterElement.value = 'Open';
                this.filterTickets();
            }
        }, 100);
    }

    viewPendingTickets() {
        this.switchToPage('tickets');
        setTimeout(() => {
            const filterElement = document.getElementById('ticket-filter');
            if (filterElement) {
                filterElement.value = 'Open';
                this.filterTickets();
            }
        }, 100);
    }

    reviewEventSuggestions() {
        this.switchToPage('events');
        // Focus on event suggestions section
    }

    viewFeedbackAnalytics() {
        this.switchToPage('feedback');
    }

    // Event Management Methods
    getEventRecommendations() {
        console.log('Generating AI event recommendations...');
        
        const recommendationsContainer = document.getElementById('event-recommendations');
        if (!recommendationsContainer) return;

        // Simulate AI recommendations based on feedback and trends
        const recommendations = [
            {
                title: 'Outdoor Movie Night',
                description: 'Based on positive feedback from previous outdoor events',
                confidence: 92,
                reasoning: 'High satisfaction rates for outdoor activities (4.8/5 stars)',
                suggestedDate: 'Next Friday, 8:00 PM',
                location: 'Garden Area',
                estimatedAttendance: '25-30 residents'
            },
            {
                title: 'Cooking Workshop',
                description: 'Residents have shown interest in community learning activities',
                confidence: 87,
                reasoning: 'Multiple requests for skill-sharing events in feedback',
                suggestedDate: 'Saturday afternoon',
                location: 'Community Hall',
                estimatedAttendance: '15-20 residents'
            },
            {
                title: 'Pet Playdate',
                description: 'Growing number of pet owners in the community',
                confidence: 78,
                reasoning: 'Observed increase in pet-related maintenance requests',
                suggestedDate: 'Sunday morning',
                location: 'Garden Area',
                estimatedAttendance: '10-15 residents'
            }
        ];

        recommendationsContainer.innerHTML = `
            <div class="card">
                <div class="card-header bg-warning text-dark">
                    <h5 class="mb-0">
                        <i class="fas fa-robot me-2"></i>
                        AI Event Recommendations
                    </h5>
                </div>
                <div class="card-body">
                    ${recommendations.map(rec => `
                        <div class="card mb-3 border-left-warning">
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-8">
                                        <h6 class="card-title text-warning">
                                            <i class="fas fa-lightbulb me-2"></i>
                                            ${rec.title}
                                        </h6>
                                        <p class="card-text">${rec.description}</p>
                                        <small class="text-muted">
                                            <strong>AI Reasoning:</strong> ${rec.reasoning}<br>
                                            <strong>Suggested:</strong> ${rec.suggestedDate} at ${rec.location}<br>
                                            <strong>Expected Attendance:</strong> ${rec.estimatedAttendance}
                                        </small>
                                    </div>
                                    <div class="col-md-4 text-end">
                                        <div class="mb-2">
                                            <span class="badge bg-success">${rec.confidence}% Confidence</span>
                                        </div>
                                        <button class="btn btn-success btn-sm me-2" onclick="app.approveEvent('${rec.title}')">
                                            <i class="fas fa-check me-1"></i>
                                            Approve
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm" onclick="app.modifyEvent('${rec.title}')">
                                            <i class="fas fa-edit me-1"></i>
                                            Modify
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generatePromotions() {
        console.log('Generating event promotions...');
        
        const promotionsContainer = document.getElementById('event-promotions');
        if (!promotionsContainer) return;

        const upcomingEvents = this.events.filter(e => e.status === 'Planned');
        
        if (upcomingEvents.length === 0) {
            promotionsContainer.innerHTML = `
                <div class="card">
                    <div class="card-body text-center">
                        <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No Events to Promote</h5>
                        <p class="text-muted">Create some events first, then generate promotions for them.</p>
                    </div>
                </div>
            `;
            return;
        }

        promotionsContainer.innerHTML = `
            <div class="card">
                <div class="card-header bg-info text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-bullhorn me-2"></i>
                        Event Promotion Materials
                    </h5>
                </div>
                <div class="card-body">
                    ${upcomingEvents.map(event => `
                        <div class="card mb-3">
                            <div class="card-body">
                                <h6 class="card-title text-info">
                                    <i class="fas fa-calendar me-2"></i>
                                    ${event.title}
                                </h6>
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>📧 Email Template</h6>
                                        <div class="border p-3 mb-3 bg-light">
                                            <strong>Subject:</strong> Don't Miss: ${event.title}!<br><br>
                                            <strong>Dear Residents,</strong><br><br>
                                            We're excited to invite you to <strong>${event.title}</strong>!<br><br>
                                            📅 <strong>When:</strong> ${new Date(event.date).toLocaleDateString()}<br>
                                            📍 <strong>Where:</strong> ${event.location}<br><br>
                                            ${event.description}<br><br>
                                            RSVP through the ResiVox app or reply to this email.<br><br>
                                            Best regards,<br>
                                            Community Management
                                        </div>
                                        <button class="btn btn-outline-primary btn-sm" onclick="app.copyPromotion('email', '${event.id}')">
                                            <i class="fas fa-copy me-1"></i>
                                            Copy Email
                                        </button>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>📱 Social Media Post</h6>
                                        <div class="border p-3 mb-3 bg-light">
                                            🎉 <strong>${event.title}</strong> is coming!<br><br>
                                            📅 ${new Date(event.date).toLocaleDateString()}<br>
                                            📍 ${event.location}<br><br>
                                            ${event.description}<br><br>
                                            #CommunityLife #ResiVox #${event.title.replace(/\s+/g, '')}
                                        </div>
                                        <button class="btn btn-outline-info btn-sm me-2" onclick="app.copyPromotion('social', '${event.id}')">
                                            <i class="fas fa-copy me-1"></i>
                                            Copy Post
                                        </button>
                                        <button class="btn btn-outline-success btn-sm" onclick="app.schedulePromotion('${event.id}')">
                                            <i class="fas fa-clock me-1"></i>
                                            Schedule
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    createNewEvent() {
        // For now, show a simple form - in a real app this would be a modal or separate page
        const eventForm = `
            <div class="card">
                <div class="card-header bg-success text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-plus me-2"></i>
                        Create New Event
                    </h5>
                </div>
                <div class="card-body">
                    <form onsubmit="app.submitNewEvent(event)">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Event Title</label>
                                    <input type="text" class="form-control" id="event-title" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Date & Time</label>
                                    <input type="datetime-local" class="form-control" id="event-date" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Location</label>
                                    <select class="form-select" id="event-location" required>
                                        <option value="">Select Location</option>
                                        <option value="Community Hall">Community Hall</option>
                                        <option value="Garden Area">Garden Area</option>
                                        <option value="Terrace">Terrace</option>
                                        <option value="Pool Area">Pool Area</option>
                                        <option value="Gym">Gym</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" id="event-description" rows="4" required></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Expected Attendance</label>
                                    <input type="number" class="form-control" id="event-attendance" min="1" max="100">
                                </div>
                            </div>
                        </div>
                        <div class="text-end">
                            <button type="button" class="btn btn-secondary me-2" onclick="app.cancelNewEvent()">Cancel</button>
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-calendar-plus me-2"></i>
                                Create Event
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const container = document.getElementById('event-recommendations');
        if (container) {
            container.innerHTML = eventForm;
        }
    }

    approveEvent(eventTitle) {
        console.log('Approving event:', eventTitle);
        alert(`Event "${eventTitle}" has been approved and added to the calendar!`);
        // In a real app, this would create the event and update the calendar
    }

    modifyEvent(eventTitle) {
        console.log('Modifying event:', eventTitle);
        alert(`Opening modification form for "${eventTitle}"`);
        // In a real app, this would open an edit form
    }

    copyPromotion(type, eventId) {
        console.log('Copying promotion:', type, eventId);
        alert(`${type === 'email' ? 'Email template' : 'Social media post'} copied to clipboard!`);
        // In a real app, this would copy the content to clipboard
    }

    schedulePromotion(eventId) {
        console.log('Scheduling promotion for event:', eventId);
        alert('Promotion scheduled for optimal engagement time!');
        // In a real app, this would schedule the promotion
    }

    async submitNewEvent(event) {
        event.preventDefault();
        
        const title = document.getElementById('event-title').value;
        const date = document.getElementById('event-date').value;
        const location = document.getElementById('event-location').value;
        const description = document.getElementById('event-description').value;
        const attendance = document.getElementById('event-attendance').value;

        try {
            console.log('Submitting new event to API...');
            
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('resivox_token')}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    date: new Date(date).toISOString(),
                    location,
                    facility: location,
                    category: 'Community',
                    estimatedAttendance: attendance
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('Event created successfully:', data.event);
                
                // Add to local events array
                this.events.push(data.event);
                
                alert(`Event "${title}" created successfully! It will now be visible to all residents.`);
                
                // Refresh the events page
                this.loadEventsPage();
                this.renderEvents();
                
                // Clear the form
                this.cancelNewEvent();
            } else {
                console.error('Failed to create event:', data.message);
                alert(`Failed to create event: ${data.message}`);
            }
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Network error while creating event. Please try again.');
        }
    }

    cancelNewEvent() {
        const container = document.getElementById('event-recommendations');
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Global functions
function switchToPage(page) {
    if (window.app) {
        window.app.switchToPage(page);
    }
}

function startVoiceListening() {
    if (window.app) {
        window.app.startVoiceListening();
    }
}

function stopVoiceListening() {
    if (window.app) {
        window.app.stopVoiceListening();
    }
}

function logout() {
    localStorage.removeItem('resivox_token');
    localStorage.removeItem('resivox_user');
    window.location.href = '/auth';
}

function getEventRecommendations() {
    if (window.app) {
        window.app.getEventRecommendations();
    }
}

function generatePromotions() {
    if (window.app) {
        window.app.generatePromotions();
    }
}

function refreshTickets() {
    if (window.app) {
        window.app.refreshTickets();
    }
}

function getEventRecommendations() {
    if (window.app) {
        window.app.getEventRecommendations();
    }
}

function generatePromotions() {
    if (window.app) {
        window.app.generatePromotions();
    }
}

function createNewEvent() {
    if (window.app) {
        window.app.createNewEvent();
    }
}

function attendEvent(eventId) {
    if (window.app) {
        window.app.attendEvent(eventId);
    }
}

function maybeAttendEvent(eventId) {
    if (window.app) {
        window.app.maybeAttendEvent(eventId);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ResiVox();
    console.log('ResiVox application initialized');
});