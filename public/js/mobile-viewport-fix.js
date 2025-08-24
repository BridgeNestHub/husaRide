// Mobile Viewport Fix for Chrome Horizontal Scrolling Issues
(function() {
    'use strict';
    
    // Fix viewport issues on mobile Chrome
    function fixMobileViewport() {
        // Ensure body doesn't exceed viewport width
        document.body.style.width = '100%';
        document.body.style.maxWidth = '100%';
        document.body.style.overflowX = 'hidden';
        
        // Fix any elements that might be causing horizontal scroll
        const problematicElements = document.querySelectorAll('*');
        problematicElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                element.style.maxWidth = '100%';
                element.style.boxSizing = 'border-box';
                element.style.overflowX = 'hidden';
            }
        });
        
        // Specific fixes for common problem elements
        const heroSection = document.querySelector('.hero');
        if (heroSection) {
            heroSection.style.width = '100%';
            heroSection.style.maxWidth = '100%';
            heroSection.style.overflowX = 'hidden';
        }
        
        const bookingForm = document.querySelector('.booking-form');
        if (bookingForm) {
            bookingForm.style.width = '100%';
            bookingForm.style.maxWidth = '100%';
            bookingForm.style.boxSizing = 'border-box';
            bookingForm.style.margin = '0 auto';
        }
        
        const inputGroups = document.querySelectorAll('.input-group');
        inputGroups.forEach(group => {
            group.style.width = '100%';
            group.style.maxWidth = '100%';
            group.style.boxSizing = 'border-box';
            
            const inputs = group.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.style.width = '100%';
                input.style.maxWidth = '100%';
                input.style.minWidth = '0';
                input.style.boxSizing = 'border-box';
            });
        });
        
        // Fix services section
        const servicesSection = document.querySelector('.services-section');
        if (servicesSection) {
            servicesSection.style.width = '100%';
            servicesSection.style.maxWidth = '100%';
            servicesSection.style.overflowX = 'hidden';
        }
        
        // Fix vehicle cards
        const vehicleCards = document.querySelectorAll('.vehicle-card-enhanced');
        vehicleCards.forEach(card => {
            card.style.width = '100%';
            card.style.maxWidth = '100%';
            card.style.boxSizing = 'border-box';
        });
    }
    
    // Apply fixes when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixMobileViewport);
    } else {
        fixMobileViewport();
    }
    
    // Apply fixes on window resize (orientation change, etc.)
    window.addEventListener('resize', function() {
        setTimeout(fixMobileViewport, 100);
    });
    
    // Apply fixes on orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(fixMobileViewport, 300);
    });
    
    // Chrome-specific fixes
    if (navigator.userAgent.includes('Chrome') && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        // Additional Chrome mobile fixes
        document.addEventListener('DOMContentLoaded', function() {
            // Force reflow to fix layout issues
            document.body.style.display = 'none';
            document.body.offsetHeight; // Trigger reflow
            document.body.style.display = '';
            
            // Apply fixes after a short delay
            setTimeout(fixMobileViewport, 50);
        });
    }
    
    // Prevent horizontal scrolling with touch events
    let startX = 0;
    document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        const currentX = e.touches[0].clientX;
        const diffX = Math.abs(currentX - startX);
        
        // If horizontal swipe is detected and would cause scroll, prevent it
        if (diffX > 10 && window.scrollX === 0) {
            const scrollWidth = document.documentElement.scrollWidth;
            const clientWidth = document.documentElement.clientWidth;
            
            if (scrollWidth <= clientWidth) {
                // No horizontal scroll should be possible
                e.preventDefault();
            }
        }
    }, { passive: false });
    
})();