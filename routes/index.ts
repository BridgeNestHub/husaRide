import express from 'express';
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.render('pages/index', { 
    title: 'HusaRide - Simple Ride-Hailing',
    user: req.user || null
  });
});

// About page
router.get('/about', (req, res) => {
  res.render('pages/about', { 
    title: 'About - HusaRide',
    user: req.user || null
  });
});

// Services page
router.get('/services', (req, res) => {
  res.render('pages/services', { 
    title: 'Services - HusaRide',
    user: req.user || null
  });
});

// Attractions page
router.get('/attractions', (req, res) => {
  res.render('pages/attractions', { 
    title: 'Washington Attractions - HusaRide',
    user: req.user || null
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('pages/contact', { 
    title: 'Contact - HusaRide',
    user: req.user || null
  });
});

// Contact form submission
router.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  
  // TODO: Send email notification
  console.log('Contact form submission:', { name, email, message });
  
  res.render('pages/contact-success', { 
    title: 'Message Sent - HusaRide',
    user: req.user || null
  });
});

export default router;