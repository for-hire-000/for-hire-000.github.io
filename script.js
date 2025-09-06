// Firebase Configuration
// Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDBUfIWyXlhfJyBugfk-Ctbdl1LMil_Ci8",
    authDomain: "dsgsdgs-13b88.firebaseapp.com",
    projectId: "dsgsdgs-13b88",
    storageBucket: "dsgsdgs-13b88.firebasestorage.app",
    messagingSenderId: "1009990407995",
    appId: "1:1009990407995:web:8312a4fa6629e520b8c91e"
};
// Initialize Firebase
let db;
let auth;

// Check if Firebase is available
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();

        // Configure Firebase Auth settings
        auth.useDeviceLanguage();

        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
} else {
    console.warn('Firebase not available - running in demo mode');
}

// DOM Elements
const projectForm = document.getElementById('projectForm');
const submitBtn = document.querySelector('.submit-btn');

// Initialize EmailJS
function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init("HdQVpdT33jKEojhyW"); // Replace with your actual public key
    } else {
        console.warn('EmailJS not loaded - emails will be disabled');
    }
}

// Email notification function
async function sendProjectConfirmationEmail(projectData) {
    if (typeof emailjs === 'undefined') {
        console.warn('EmailJS not available - skipping confirmation email');
        return;
    }

    if (!projectData.contactEmail) {
        console.warn('No email address found for project confirmation');
        return;
    }

    try {
        const templateParams = {
            to_email: projectData.contactEmail,
            project_type: getProjectTypeDisplay(projectData.projectType),
            project_description: projectData.projectDescription.substring(0, 200) + (projectData.projectDescription.length > 200 ? '...' : ''),
            timeline: getTimelineDisplay(projectData.timeline),
            budget: projectData.budget,
            crypto_payment: projectData.cryptoPayment,
            contact_method: projectData.contactMethod,
            project_id: projectData.id,
            submission_date: new Date(projectData.timestamp).toLocaleDateString(),
            submission_time: new Date(projectData.timestamp).toLocaleTimeString()
        };

        await emailjs.send(
            'service_64bmwtd', // Replace with your EmailJS service ID
            'template_iunzxdz', // Replace with your template ID
            templateParams
        );

        console.log('Project confirmation email sent successfully to:', projectData.contactEmail);

    } catch (error) {
        console.error('Error sending project confirmation email:', error);
        // Don't throw error since this is a background operation
    }
}

// Utility functions for email templates
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

// Scroll to section function
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Add scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Add fade-in class to elements
    const animatedElements = document.querySelectorAll('.service-card, .crypto-card, .contact-info, .contact-form');
    animatedElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
}

// Form validation
function validateForm(formData) {
    const errors = [];

    if (!formData.projectType) {
        errors.push('Please select a project type');
    }

    if (!formData.projectDescription || formData.projectDescription.length < 50) {
        errors.push('Project description must be at least 50 characters');
    }

    if (!formData.budget) {
        errors.push('Please select a budget range');
    }

    if (!formData.timeline) {
        errors.push('Please select a timeline');
    }

    if (!formData.cryptoPayment) {
        errors.push('Please select a preferred cryptocurrency');
    }

    if (!formData.contactEmail || !isValidEmail(formData.contactEmail)) {
        errors.push('Please enter a valid email address');
    }

    if (!formData.contactMethod) {
        errors.push('Please select a contact method');
    }

    return errors;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Handle form submission
async function handleFormSubmission(event) {
    event.preventDefault();

    // Get form data
    const formData = new FormData(projectForm);
    const data = Object.fromEntries(formData.entries());

    // Add timestamp and ID
    data.timestamp = new Date().toISOString();
    data.id = generateUniqueId();
    data.status = 'new';

    // Validate form
    const errors = validateForm(data);
    if (errors.length > 0) {
        showErrorMessage(errors.join('<br>'));
        return;
    }

    // Update submit button
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading"></span> SUBMITTING...';
    submitBtn.disabled = true;

    try {
        // Submit to Firebase if available
        if (db) {
            await db.collection('project-requests').add(data);
            console.log('Project request submitted successfully');
        } else {
            // Demo mode - log to console
            console.log('Demo mode - Project request data:', data);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Send confirmation email
        await sendProjectConfirmationEmail(data);

        showSuccessMessage();
        projectForm.reset();

    } catch (error) {
        console.error('Error submitting form:', error);
        showErrorMessage('There was an error submitting your request. Please try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showSuccessMessage() {
    // Remove any existing messages
    removeMessages();

    const message = document.createElement('div');
    message.className = 'success-message';
    message.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <strong>Request Submitted Successfully!</strong><br>
        I'll review your project and get back to you within 24 hours via your preferred contact method.<br>
        <small>A confirmation email has been sent to your email address.</small>
    `;
    projectForm.appendChild(message);

    // Remove message after 5 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, 5000);
}

function showErrorMessage(message) {
    removeMessages();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: linear-gradient(45deg, #ff004022, #cc000022);
        border: 1px solid #ff0040;
        color: #ffffff;
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
        text-align: center;
        animation: slideIn 0.5s ease-out;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <strong>Error:</strong><br>
        ${message}
    `;
    projectForm.appendChild(errorDiv);

    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function removeMessages() {
    const messages = projectForm.querySelectorAll('.success-message, .error-message');
    messages.forEach(msg => msg.remove());
}

// Navigation scroll effect
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(5, 5, 5, 0.95)';
        } else {
            navbar.style.background = 'rgba(10, 10, 10, 0.9)';
        }
    });
}

// Add glitch effect to form focus
function initFormEffects() {
    const inputs = document.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.3)';
            this.style.borderColor = 'var(--primary-color)';
        });

        input.addEventListener('blur', function() {
            if (!this.value) {
                this.style.boxShadow = 'none';
                this.style.borderColor = 'var(--border-color)';
            }
        });
    });
}

// Add typing effect to hero subtitle
function initTypingEffect() {
    const subtitle = document.querySelector('.hero-subtitle');
    const text = subtitle.textContent;
    subtitle.textContent = '';

    let i = 0;
    const typeWriter = () => {
        if (i < text.length) {
            subtitle.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, 100);
        }
    };

    setTimeout(typeWriter, 1000);
}

// Add particle click effect
function initParticleEffects() {
    document.addEventListener('click', function(e) {
        createClickParticle(e.clientX, e.clientY);
    });
}

function createClickParticle(x, y) {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 6px;
        height: 6px;
        background: var(--primary-color);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 0 20px var(--primary-color);
        animation: particleExplode 0.8s ease-out forwards;
    `;

    document.body.appendChild(particle);

    setTimeout(() => {
        particle.remove();
    }, 800);
}

// Add CSS for particle animation
const style = document.createElement('style');
style.textContent = `
    @keyframes particleExplode {
        0% {
            transform: scale(0);
            opacity: 1;
        }
        50% {
            transform: scale(1);
            opacity: 0.8;
        }
        100% {
            transform: scale(0);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Add smooth scrolling for navigation links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
}

// Add random background particles
function createBackgroundParticles() {
    const particleContainer = document.querySelector('.bg-animation');

    setInterval(() => {
        if (particleContainer.children.length < 10) {
            const particle = document.createElement('div');
            particle.className = 'bg-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (15 + Math.random() * 10) + 's';
            particle.style.animationDelay = '0s';
            particleContainer.appendChild(particle);

            setTimeout(() => {
                if (particle.parentNode) {
                    particle.remove();
                }
            }, 25000);
        }
    }, 3000);
}

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Code Forge website...');

    // Initialize EmailJS if available
    if (typeof emailjs !== 'undefined') {
        initEmailJS();
    } else {
        console.warn('EmailJS not loaded - email notifications will not work');
    }

    // Initialize all features
    initScrollAnimations();
    initNavbarScroll();
    initFormEffects();
    initTypingEffect();
    initParticleEffects();
    initSmoothScrolling();
    createBackgroundParticles();

    // Attach form handler
    if (projectForm) {
        projectForm.addEventListener('submit', handleFormSubmission);
    }

    console.log('Code Forge website initialized successfully');
});

// Export functions for admin page
window.CodeForge = {
    db: () => db,
    auth: () => auth,
    generateUniqueId,
    scrollToSection
};
