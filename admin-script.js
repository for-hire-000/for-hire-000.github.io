// Admin Panel JavaScript

// Global variables
let allProjects = [];
let filteredProjects = [];
let currentView = 'cards';
let selectedProject = null;
let currentUser = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const projectsGrid = document.getElementById('projectsGrid');
const projectsTable = document.getElementById('projectsTable');
const projectsTableBody = document.getElementById('projectsTableBody');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const projectModal = document.getElementById('projectModal');
const modalBody = document.getElementById('modalBody');

// Initialize EmailJS
function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("HdQVpdT33jKEojhyW"); // Replace with your actual public key
    } else {
        console.warn('EmailJS not loaded - emails will be disabled');
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing admin panel...');

    // Initialize EmailJS if available
    if (typeof emailjs !== 'undefined') {
        initEmailJS();
    }

    // Initialize Firebase Auth state listener
    initFirebaseAuth();

    // Attach event listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Initialize scroll animations for admin
    initAdminAnimations();

    console.log('Admin panel initialized');
});

// Initialize Firebase Authentication
function initFirebaseAuth() {
    const auth = window.CodeForge?.auth();

    if (auth) {
        // Listen for authentication state changes
        auth.onAuthStateChanged((user) => {
            currentUser = user;

            if (user) {
                console.log('User authenticated:', user.email);
                showDashboard();
            } else {
                console.log('User not authenticated');
                showLogin();
            }
        });
    } else {
        console.warn('Firebase Auth not available - showing login form');
        showLogin();
    }
}

// Authentication functions
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    // Update submit button
    const submitBtn = document.querySelector('.login-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading"></span> AUTHENTICATING...';
    submitBtn.disabled = true;

    try {
        const auth = window.CodeForge?.auth();

        if (auth) {
            // Sign in with Firebase Auth
            await auth.signInWithEmailAndPassword(email, password);

            // Success - the onAuthStateChanged listener will handle showing dashboard
            hideLoginError();

        } else {
            // Fallback for demo mode
            console.log('Demo mode - simulating login');
            currentUser = { email: email, uid: 'demo-user' };
            showDashboard();
        }

    } catch (error) {
        console.error('Login error:', error);

        let errorMessage = 'Authentication failed. Please check your credentials.';

        // Handle specific Firebase Auth errors
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No admin account found with this email address.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password. Please try again.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This admin account has been disabled.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            default:
                errorMessage = error.message || errorMessage;
        }

        showLoginError(errorMessage);

    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function isLoggedIn() {
    return currentUser !== null;
}

async function logout() {
    try {
        const auth = window.CodeForge?.auth();

        if (auth && currentUser) {
            await auth.signOut();
            console.log('User signed out successfully');
        }

        currentUser = null;
        showLogin();

    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if Firebase fails
        currentUser = null;
        showLogin();
    }
}

function showLogin() {
    loginScreen.style.display = 'flex';
    adminDashboard.style.display = 'none';

    // Clear form
    if (loginForm) {
        loginForm.reset();
    }
    hideLoginError();
}

function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'block';

    // Load projects
    loadProjects();
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

function hideLoginError() {
    loginError.style.display = 'none';
}

// Email notification functions
async function sendStatusUpdateEmail(project, newStatus, oldStatus) {
    if (typeof emailjs === 'undefined') {
        console.warn('EmailJS not available - skipping status update email');
        return;
    }

    if (!project.contactEmail) {
        console.warn('No email address found for project:', project.id);
        return;
    }

    try {
        const templateParams = {
            to_email: project.contactEmail,
            project_type: getProjectTypeDisplay(project.projectType),
            project_description: project.projectDescription.substring(0, 200) + (project.projectDescription.length > 200 ? '...' : ''),
            old_status: getStatusDisplay(oldStatus),
            new_status: getStatusDisplay(newStatus),
            project_id: project.id,
            timeline: getTimelineDisplay(project.timeline),
            budget: project.budget,
            crypto_payment: project.cryptoPayment,
            contact_method: project.contactMethod
        };

        await emailjs.send(
            'service_64bmwtd', // Replace with your EmailJS service ID
            'template_imwy85m', // Replace with your template ID
            templateParams
        );

        console.log('Status update email sent successfully to:', project.contactEmail);
        showSuccess('Status updated and notification email sent!');

    } catch (error) {
        console.error('Error sending status update email:', error);
        showSuccess('Status updated successfully!');
        // Don't show email error to user, just log it
    }
}

// Project management functions
async function loadProjects() {
    try {
        showLoadingState();

        // Get Firebase database reference
        const db = window.CodeForge?.db();

        if (db) {
            // Load from Firebase
            const querySnapshot = await db.collection('project-requests')
                .orderBy('timestamp', 'desc')
                .get();

            allProjects = [];
            querySnapshot.forEach(doc => {
                allProjects.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Loaded ${allProjects.length} projects from Firebase`);

        } else {
            // Demo mode - generate sample data
            console.log('Demo mode - generating sample projects');
            allProjects = generateSampleProjects();
        }

        // Update filtered projects
        filteredProjects = [...allProjects];

        // Update dashboard
        updateStats();
        displayProjects();

    } catch (error) {
        console.error('Error loading projects:', error);
        showError('Error loading projects. Please try again.');
    }
}

function generateSampleProjects() {
    const sampleProjects = [
        {
            id: 'demo-1',
            projectType: 'cpp',
            projectDescription: 'Need a high-performance game engine with custom memory management and multi-threading support. The engine should handle 3D graphics, physics simulation, and audio processing.',
            budget: '5000-10000',
            timeline: 'extended',
            cryptoPayment: 'BTC',
            contactEmail: 'gamer@example.com',
            contactMethod: 'discord',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'new'
        },
        {
            id: 'demo-2',
            projectType: 'csharp',
            projectDescription: 'Enterprise-level inventory management system with real-time tracking, barcode scanning, and reporting features. Needs to integrate with existing ERP systems.',
            budget: '2500-5000',
            timeline: 'standard',
            cryptoPayment: 'ETH',
            contactEmail: 'business@example.com',
            contactMethod: 'email',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'in-progress'
        },
        {
            id: 'demo-3',
            projectType: 'both',
            projectDescription: 'Cross-platform trading bot with C++ backend for speed and C# frontend for management. Should support multiple cryptocurrency exchanges.',
            budget: '10000+',
            timeline: 'rush',
            cryptoPayment: 'XMR',
            contactEmail: 'trader@example.com',
            contactMethod: 'telegram',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'reviewing'
        }
    ];

    return sampleProjects;
}

function updateStats() {
    const totalRequests = allProjects.length;
    const newRequests = allProjects.filter(p => p.status === 'new').length;
    const activeProjects = allProjects.filter(p => p.status === 'in-progress').length;
    const cryptoPayments = new Set(allProjects.map(p => p.cryptoPayment)).size;

    document.getElementById('totalRequests').textContent = totalRequests;
    document.getElementById('newRequests').textContent = newRequests;
    document.getElementById('activeProjects').textContent = activeProjects;
    document.getElementById('cryptoPayments').textContent = cryptoPayments;
}

function displayProjects() {
    hideLoadingState();

    if (filteredProjects.length === 0) {
        showEmptyState();
        return;
    }

    hideEmptyState();

    if (currentView === 'cards') {
        displayProjectsGrid();
    } else {
        displayProjectsTable();
    }
}

function displayProjectsGrid() {
    projectsGrid.style.display = 'grid';
    projectsTable.style.display = 'none';

    projectsGrid.innerHTML = '';

    filteredProjects.forEach(project => {
        const card = createProjectCard(project);
        projectsGrid.appendChild(card);
    });
}

function displayProjectsTable() {
    projectsGrid.style.display = 'none';
    projectsTable.style.display = 'block';

    projectsTableBody.innerHTML = '';

    filteredProjects.forEach(project => {
        const row = createProjectRow(project);
        projectsTableBody.appendChild(row);
    });
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.onclick = () => openProjectModal(project);

    const date = new Date(project.timestamp).toLocaleDateString();
    const statusClass = `status-${project.status}`;

    card.innerHTML = `
        <div class="project-header">
            <div class="project-type">${getProjectTypeDisplay(project.projectType)}</div>
            <div class="project-date">${date}</div>
        </div>

        <div class="project-description">
            ${project.projectDescription}
        </div>

        <div class="project-details">
            <div class="project-detail">
                <label>Budget</label>
                <span>$${project.budget}</span>
            </div>
            <div class="project-detail">
                <label>Timeline</label>
                <span>${getTimelineDisplay(project.timeline)}</span>
            </div>
            <div class="project-detail">
                <label>Crypto</label>
                <span>${project.cryptoPayment}</span>
            </div>
            <div class="project-detail">
                <label>Contact</label>
                <span>${project.contactMethod}</span>
            </div>
        </div>

        <div class="project-footer">
            <div class="project-status ${statusClass}">
                ${getStatusDisplay(project.status)}
            </div>
            <div class="project-actions">
                <button class="action-btn" onclick="event.stopPropagation(); openProjectModal(project)">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" onclick="event.stopPropagation(); updateProjectStatus(project.id)">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
    `;

    return card;
}

function createProjectRow(project) {
    const row = document.createElement('tr');
    row.onclick = () => openProjectModal(project);

    const date = new Date(project.timestamp).toLocaleDateString();
    const statusClass = `status-${project.status}`;

    row.innerHTML = `
        <td>${date}</td>
        <td>${getProjectTypeDisplay(project.projectType)}</td>
        <td>$${project.budget}</td>
        <td>${project.cryptoPayment}</td>
        <td>${getTimelineDisplay(project.timeline)}</td>
        <td><span class="project-status ${statusClass}">${getStatusDisplay(project.status)}</span></td>
        <td>
            <div class="project-actions">
                <button class="action-btn" onclick="event.stopPropagation(); openProjectModal(project)">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn" onclick="event.stopPropagation(); updateProjectStatus('${project.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </td>
    `;

    return row;
}

// Utility functions
function getProjectTypeDisplay(type) {
    const types = {
        'cpp': 'C++',
        'csharp': 'C#',
        'both': 'C++ & C#'
    };
    return types[type] || type;
}

function getTimelineDisplay(timeline) {
    const timelines = {
        'rush': 'Rush (1-2 weeks)',
        'standard': 'Standard (2-4 weeks)',
        'extended': 'Extended (1-2 months)',
        'flexible': 'Flexible'
    };
    return timelines[timeline] || timeline;
}

function getStatusDisplay(status) {
    const statuses = {
        'new': 'New',
        'reviewing': 'Reviewing',
        'in-progress': 'In Progress',
        'completed': 'Completed',
        'rejected': 'Rejected'
    };
    return statuses[status] || status;
}

// Filter and search functions
function filterProjects() {
    const statusFilter = document.getElementById('statusFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const cryptoFilter = document.getElementById('cryptoFilter').value;
    const searchInput = document.getElementById('searchInput').value.toLowerCase();

    filteredProjects = allProjects.filter(project => {
        // Status filter
        if (statusFilter && project.status !== statusFilter) return false;

        // Type filter
        if (typeFilter && project.projectType !== typeFilter) return false;

        // Crypto filter
        if (cryptoFilter && project.cryptoPayment !== cryptoFilter) return false;

        // Search filter
        if (searchInput) {
            const searchable = `
                ${project.projectDescription}
                ${project.contactEmail}
                ${project.budget}
                ${project.timeline}
            `.toLowerCase();

            if (!searchable.includes(searchInput)) return false;
        }

        return true;
    });

    displayProjects();
}

// View toggle functions
function toggleView(view) {
    currentView = view;

    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    displayProjects();
}

// Modal functions
function openProjectModal(project) {
    selectedProject = project;

    const date = new Date(project.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>Project Type</label>
                <span>${getProjectTypeDisplay(project.projectType)}</span>
            </div>
            <div class="detail-item">
                <label>Budget Range</label>
                <span>$${project.budget}</span>
            </div>
            <div class="detail-item">
                <label>Timeline</label>
                <span>${getTimelineDisplay(project.timeline)}</span>
            </div>
            <div class="detail-item">
                <label>Crypto Payment</label>
                <span>${project.cryptoPayment}</span>
            </div>
            <div class="detail-item">
                <label>Contact Email</label>
                <span>${project.contactEmail}</span>
            </div>
            <div class="detail-item">
                <label>Contact Method</label>
                <span>${project.contactMethod}</span>
            </div>
            <div class="detail-item">
                <label>Submitted</label>
                <span>${formattedDate}</span>
            </div>
            <div class="detail-item">
                <label>Current Status</label>
                <span class="project-status status-${project.status}">${getStatusDisplay(project.status)}</span>
            </div>
        </div>

        <div class="detail-description">
            <h4>Project Description</h4>
            <p>${project.projectDescription}</p>
        </div>

        <div class="status-update">
            <label for="newStatus">Update Status</label>
            <select id="newStatus">
                <option value="new" ${project.status === 'new' ? 'selected' : ''}>New</option>
                <option value="reviewing" ${project.status === 'reviewing' ? 'selected' : ''}>Reviewing</option>
                <option value="in-progress" ${project.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="rejected" ${project.status === 'rejected' ? 'selected' : ''}>Rejected</option>
            </select>
        </div>
    `;

    projectModal.style.display = 'flex';
}

function closeModal() {
    projectModal.style.display = 'none';
    selectedProject = null;
}

async function updateProjectStatus() {
    if (!selectedProject) return;

    const newStatus = document.getElementById('newStatus').value;
    const oldStatus = selectedProject.status;

    // Don't send email if status hasn't changed
    if (newStatus === oldStatus) {
        closeModal();
        return;
    }

    try {
        const db = window.CodeForge?.db();

        if (db) {
            // Update in Firebase
            await db.collection('project-requests').doc(selectedProject.id).update({
                status: newStatus
            });

            console.log('Project status updated in Firebase');
        }

        // Update local data
        const projectIndex = allProjects.findIndex(p => p.id === selectedProject.id);
        if (projectIndex !== -1) {
            allProjects[projectIndex].status = newStatus;
        }

        const filteredIndex = filteredProjects.findIndex(p => p.id === selectedProject.id);
        if (filteredIndex !== -1) {
            filteredProjects[filteredIndex].status = newStatus;
        }

        // Send status update email
        await sendStatusUpdateEmail(selectedProject, newStatus, oldStatus);

        // Refresh display
        updateStats();
        displayProjects();
        closeModal();

    } catch (error) {
        console.error('Error updating project status:', error);
        showError('Error updating project status. Please try again.');
    }
}

// State management functions
function showLoadingState() {
    loadingState.style.display = 'block';
    projectsGrid.style.display = 'none';
    projectsTable.style.display = 'none';
    emptyState.style.display = 'none';
}

function hideLoadingState() {
    loadingState.style.display = 'none';
}

function showEmptyState() {
    emptyState.style.display = 'block';
    projectsGrid.style.display = 'none';
    projectsTable.style.display = 'none';
}

function hideEmptyState() {
    emptyState.style.display = 'none';
}

// Notification functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    if (type === 'success') {
        notification.style.background = 'linear-gradient(45deg, var(--primary-color), #00cc33)';
    } else {
        notification.style.background = 'linear-gradient(45deg, var(--secondary-color), #cc0000)';
    }

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Animation functions
function initAdminAnimations() {
    // Add entrance animations to cards when they appear
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.animation = 'fadeInUp 0.5s ease-out forwards';
                }, index * 100);
            }
        });
    });

    // Observe project cards when they're created
    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList.contains('project-card')) {
                    observer.observe(node);
                }
            });
        });
    });

    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Add CSS for admin animations
const adminStyle = document.createElement('style');
adminStyle.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .project-card {
        opacity: 0;
        transform: translateY(30px);
    }
`;
document.head.appendChild(adminStyle);

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // ESC to close modal
    if (e.key === 'Escape' && projectModal.style.display === 'flex') {
        closeModal();
    }

    // F5 to refresh projects (prevent default browser refresh)
    if (e.key === 'F5') {
        e.preventDefault();
        loadProjects();
    }
});

// Auto-refresh projects every 5 minutes
setInterval(() => {
    if (isLoggedIn() && adminDashboard.style.display === 'block') {
        loadProjects();
    }
}, 5 * 60 * 1000);
