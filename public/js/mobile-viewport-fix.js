// Mobile Viewport Fix - Prevents horizontal scrolling
(function() {
    'use strict';
    
    // Function to fix viewport issues
    function fixViewport() {
        // Ensure body doesn't exceed viewport width
        document.body.style.maxWidth = '100vw';
        document.body.style.overflowX = 'hidden';
        
        // Find and fix any elements that might be causing horizontal scroll
        const problematicElements = document.querySelectorAll('*');
        
        problematicElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(element);
            
            // Check if element extends beyond viewport
            if (rect.right > window.innerWidth) {
                // Apply fixes based on element type
                if (element.tagName === 'IMG') {
                    element.style.maxWidth = '100%';
                    element.style.height = 'auto';
                }
                
                // Fix containers and divs
                if (['DIV', 'SECTION', 'MAIN', 'ARTICLE', 'ASIDE'].includes(element.tagName)) {
                    element.style.maxWidth = '100%';
                    element.style.boxSizing = 'border-box';
                    element.style.overflowX = 'hidden';
                }
                
                // Fix form elements
                if (['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
                    element.style.maxWidth = '100%';
                    element.style.boxSizing = 'border-box';
                }
                
                // Fix buttons\n                if (element.tagName === 'BUTTON') {\n                    element.style.maxWidth = '100%';\n                    element.style.boxSizing = 'border-box';\n                }\n            }\n        });\n    }\n    \n    // Function to handle orientation changes\n    function handleOrientationChange() {\n        setTimeout(() => {\n            fixViewport();\n            // Force a reflow\n            document.body.style.display = 'none';\n            document.body.offsetHeight; // Trigger reflow\n            document.body.style.display = '';\n        }, 100);\n    }\n    \n    // Function to prevent zoom on input focus (iOS)\n    function preventZoomOnInputs() {\n        const inputs = document.querySelectorAll('input, select, textarea');\n        inputs.forEach(input => {\n            // Ensure font-size is at least 16px to prevent zoom\n            const fontSize = window.getComputedStyle(input).fontSize;\n            if (parseInt(fontSize) < 16) {\n                input.style.fontSize = '16px';\n            }\n        });\n    }\n    \n    // Function to fix specific known problematic elements\n    function fixKnownIssues() {\n        // Fix hero section\n        const hero = document.querySelector('.hero');\n        if (hero) {\n            hero.style.maxWidth = '100%';\n            hero.style.overflowX = 'hidden';\n        }\n        \n        // Fix services section\n        const servicesSection = document.querySelector('.services-section');\n        if (servicesSection) {\n            servicesSection.style.maxWidth = '100%';\n            servicesSection.style.overflowX = 'hidden';\n        }\n        \n        // Fix booking form\n        const bookingForm = document.querySelector('.booking-form');\n        if (bookingForm) {\n            bookingForm.style.maxWidth = '100%';\n            bookingForm.style.boxSizing = 'border-box';\n        }\n        \n        // Fix vehicle cards\n        const vehicleCards = document.querySelectorAll('.vehicle-card-enhanced');\n        vehicleCards.forEach(card => {\n            card.style.maxWidth = '100%';\n            card.style.boxSizing = 'border-box';\n        });\n        \n        // Fix input groups\n        const inputGroups = document.querySelectorAll('.input-group');\n        inputGroups.forEach(group => {\n            group.style.maxWidth = '100%';\n            group.style.boxSizing = 'border-box';\n            \n            const inputs = group.querySelectorAll('input, select');\n            inputs.forEach(input => {\n                input.style.maxWidth = '100%';\n                input.style.boxSizing = 'border-box';\n            });\n        });\n        \n        // Fix navigation\n        const nav = document.querySelector('nav');\n        if (nav) {\n            nav.style.maxWidth = '100%';\n            nav.style.overflowX = 'hidden';\n        }\n    }\n    \n    // Function to monitor for new elements that might cause issues\n    function setupMutationObserver() {\n        const observer = new MutationObserver(mutations => {\n            let shouldFix = false;\n            \n            mutations.forEach(mutation => {\n                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {\n                    mutation.addedNodes.forEach(node => {\n                        if (node.nodeType === 1) { // Element node\n                            shouldFix = true;\n                        }\n                    });\n                }\n            });\n            \n            if (shouldFix) {\n                setTimeout(fixViewport, 50);\n            }\n        });\n        \n        observer.observe(document.body, {\n            childList: true,\n            subtree: true\n        });\n    }\n    \n    // Initialize fixes when DOM is ready\n    function init() {\n        fixViewport();\n        fixKnownIssues();\n        preventZoomOnInputs();\n        setupMutationObserver();\n        \n        // Add event listeners\n        window.addEventListener('orientationchange', handleOrientationChange);\n        window.addEventListener('resize', () => {\n            setTimeout(fixViewport, 100);\n        });\n        \n        // Fix on scroll (in case of dynamic content)\n        let scrollTimeout;\n        window.addEventListener('scroll', () => {\n            clearTimeout(scrollTimeout);\n            scrollTimeout = setTimeout(fixViewport, 200);\n        });\n    }\n    \n    // Run immediately if DOM is already loaded\n    if (document.readyState === 'loading') {\n        document.addEventListener('DOMContentLoaded', init);\n    } else {\n        init();\n    }\n    \n    // Also run after a short delay to catch any late-loading content\n    setTimeout(init, 1000);\n    \n})();