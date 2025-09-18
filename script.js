// Enhanced script with loading animation
document.addEventListener('DOMContentLoaded', function() {
    // Show loading screen
    showLoadingScreen();
    
    // Initialize app after loading
    setTimeout(() => {
        hideLoadingScreen();
        initializeApp();
    }, 4500);
});

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');
    
    loadingScreen.style.display = 'flex';
    mainApp.classList.add('hidden');
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');
    
    // Fade out loading screen
    loadingScreen.style.animation = 'fadeOut 1s ease forwards';
    
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        mainApp.classList.remove('hidden');
        
        // Start main app animations
        startAppAnimations();
    }, 1000);
}

function startAppAnimations() {
    // Animate sidebar navigation items
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach((link, index) => {
        setTimeout(() => {
            link.style.animation = `slideInLeft 0.5s ease ${index * 0.1}s forwards`;
        }, 500);
    });
    
    // Animate stats cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.animation = `cardSlideUp 0.6s ease ${index * 0.15}s forwards`;
        }, 800);
    });
}

// Rest of your existing JavaScript code with enhanced animations...
// (Include all the previous JavaScript functionality here)

// Enhanced notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'danger' ? 'exclamation-circle' : 
                 type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--${type === 'success' ? 'success' : type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'primary'}-gradient); display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-${icon}" style="color: white;"></i>
            </div>
            <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div style="opacity: 0.9;">${message}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'notificationSlideOut 0.4s ease forwards';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 400);
    }, 5000);
}

// Add additional CSS animations
const additionalAnimations = `
@keyframes slideInLeft {
    from {
        opacity: 0;
        transform: translateX(-50px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes cardSlideUp {
    from {
        opacity: 0;
        transform: translateY(50px) scale(0.9);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes notificationSlideOut {
    to {
        opacity: 0;
        transform: translateX(100%) scale(0.8);
    }
}

@keyframes pulseGlow {
    0%, 100% {
        box-shadow: 0 0 20px rgba(0, 242, 254, 0.3);
    }
    50% {
        box-shadow: 0 0 40px rgba(0, 242, 254, 0.6);
    }
}

.pulse-glow {
    animation: pulseGlow 2s ease-in-out infinite;
}
`;

// Add the additional animations to the page
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalAnimations;
document.head.appendChild(styleSheet);

// Add all your existing JavaScript functions here...
// (Include the complete expense tracking functionality from the previous code)
