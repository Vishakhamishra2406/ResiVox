// ResiVox Authentication System
class AuthManager {
    constructor() {
        this.apiBase = '/api/auth';
        this.init();
    }

    init() {
        this.setupEventListeners();
        
        // Only run auth check on login/register pages
        if (
            window.location.pathname.includes('auth') ||
            window.location.pathname.includes('login') ||
            window.location.pathname === '/'
        ) {
            this.checkExistingAuth();
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Role selection handler
        const userRole = document.getElementById('userRole');
        if (userRole) {
            userRole.addEventListener('change', (e) => this.handleRoleChange(e));
        }

        // Password confirmation validation
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
        }
    }

    handleRoleChange(e) {
        const role = e.target.value;
        const unitNumberField = document.getElementById('unitNumberField');
        const adminCodeField = document.getElementById('adminCodeField');
        const unitNumberInput = document.getElementById('unitNumber');
        const adminCodeInput = document.getElementById('adminCode');

        if (role === 'admin') {
            // Show admin code field, hide unit number field
            unitNumberField.style.display = 'none';
            adminCodeField.style.display = 'block';
            unitNumberInput.required = false;
            adminCodeInput.required = true;
        } else if (role === 'resident') {
            // Show unit number field, hide admin code field
            unitNumberField.style.display = 'block';
            adminCodeField.style.display = 'none';
            unitNumberInput.required = true;
            adminCodeInput.required = false;
        } else {
            // Hide both fields if no role selected
            unitNumberField.style.display = 'none';
            adminCodeField.style.display = 'none';
            unitNumberInput.required = false;
            adminCodeInput.required = false;
        }
    }

    checkExistingAuth() {
        const token = localStorage.getItem('resivox_token');
        if (token) {
            // Verify token with server
            this.verifyToken(token);
        }
    }

    async verifyToken(token) {
        try {
            console.log('Verifying existing token...');
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Token verification response:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Token valid, redirecting to dashboard');
                this.redirectToDashboard();
            } else {
                console.log('Token invalid, clearing storage');
                localStorage.removeItem('resivox_token');
                localStorage.removeItem('resivox_user');
            }
        } catch (error) {
            console.warn('Token verification skipped:', error);
            // Don't clear token on network errors - only on auth page
            if (window.location.pathname.includes('auth')) {
                localStorage.removeItem('resivox_token');
                localStorage.removeItem('resivox_user');
            }
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const role = document.getElementById('loginRole').value;
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!role || !email || !password) {
            this.showAlert('login', 'Please fill in all fields including your role', 'danger');
            return;
        }

        this.setLoading('loginBtn', true);
        this.clearAlerts('login');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role, email, password, rememberMe })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token
                localStorage.setItem('resivox_token', data.token);
                if (data.user) {
                    localStorage.setItem('resivox_user', JSON.stringify(data.user));
                }

                // Show role-specific success message
                const roleText = data.user.role === 'admin' ? 'Admin Dashboard' : 'Resident Dashboard';
                this.showAlert('login', `Welcome ${data.user.firstName}! Redirecting to ${roleText}...`, 'success');
                
                // Redirect immediately to dashboard
                setTimeout(() => {
                    console.log('Redirecting to dashboard for role:', data.user.role);
                    this.redirectToDashboard();
                }, 1000);
            } else {
                this.showAlert('login', data.message || 'Login failed', 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('login', 'Network error. Please try again.', 'danger');
        } finally {
            this.setLoading('loginBtn', false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const userRole = document.getElementById('userRole').value;
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('registerEmail').value;
        const unitNumber = document.getElementById('unitNumber').value;
        const adminCode = document.getElementById('adminCode').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        // Validation
        if (!userRole) {
            this.showAlert('register', 'Please select your registration type', 'danger');
            return;
        }

        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            this.showAlert('register', 'Please fill in all required fields', 'danger');
            return;
        }

        if (userRole === 'resident' && !unitNumber) {
            this.showAlert('register', 'Please enter your unit number', 'danger');
            return;
        }

        if (userRole === 'admin' && !adminCode) {
            this.showAlert('register', 'Please enter the admin access code', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            this.showAlert('register', 'Passwords do not match', 'danger');
            return;
        }

        if (password.length < 6) {
            this.showAlert('register', 'Password must be at least 6 characters long', 'danger');
            return;
        }

        if (!agreeTerms) {
            this.showAlert('register', 'Please agree to the Terms of Service and Privacy Policy', 'danger');
            return;
        }

        this.setLoading('registerBtn', true);
        this.clearAlerts('register');

        try {
            const requestBody = {
                role: userRole,
                firstName,
                lastName,
                email,
                password
            };

            // Add role-specific fields
            if (userRole === 'resident') {
                requestBody.unitNumber = unitNumber;
            } else if (userRole === 'admin') {
                requestBody.adminCode = adminCode;
            }

            console.log('Sending registration request:', requestBody);

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            console.log('Registration response:', data);

            if (response.ok) {
                // Store token
                localStorage.setItem('resivox_token', data.token);
                if (data.user) {
                    localStorage.setItem('resivox_user', JSON.stringify(data.user));
                }

                this.showAlert('register', 'Account created successfully! Redirecting...', 'success');
                
                // Redirect after short delay
                setTimeout(() => {
                    this.redirectToDashboard();
                }, 1500);
            } else {
                this.showAlert('register', data.message || 'Registration failed', 'danger');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showAlert('register', 'Network error. Please try again.', 'danger');
        } finally {
            this.setLoading('registerBtn', false);
        }
    }

    validatePasswordMatch() {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmField = document.getElementById('confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            confirmField.classList.add('is-invalid');
            confirmField.classList.remove('is-valid');
        } else if (confirmPassword) {
            confirmField.classList.add('is-valid');
            confirmField.classList.remove('is-invalid');
        }
    }

    showAlert(form, message, type) {
        const alertContainer = document.getElementById(`${form === 'login' ? 'auth' : 'register'}-alerts`);
        if (alertContainer) {
            alertContainer.innerHTML = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    }

    clearAlerts(form) {
        const alertContainer = document.getElementById(`${form === 'login' ? 'auth' : 'register'}-alerts`);
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
    }

    setLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        const btnText = button.querySelector('.btn-text');
        const spinner = button.querySelector('.loading-spinner');

        if (loading) {
            button.disabled = true;
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    redirectToDashboard() {
        console.log('Redirecting to main dashboard...');
        window.location.href = '/';
    }
}

// Form switching functions
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

function showAdminHelp() {
    const modal = new bootstrap.Modal(document.getElementById('adminHelpModal'));
    modal.show();
}

// Initialize authentication manager
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    console.log('ResiVox Authentication initialized');
});