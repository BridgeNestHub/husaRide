// Image Optimization and Lazy Loading
class ImageOptimizer {
  constructor() {
    this.init();
  }

  init() {
    this.setupLazyLoading();
    this.preloadCriticalImages();
    this.setupWebPSupport();
  }

  // Lazy loading for images
  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            this.loadImage(img);
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      // Fallback for older browsers
      document.querySelectorAll('img[data-src]').forEach(img => {
        this.loadImage(img);
      });
    }
  }

  // Load image with error handling
  loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Create new image to preload
    const imageLoader = new Image();
    
    imageLoader.onload = () => {
      img.src = src;
      img.classList.add('loaded');
      img.removeAttribute('data-src');
    };
    
    imageLoader.onerror = () => {
      img.classList.add('error');
      // Set fallback image
      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';
    };
    
    imageLoader.src = src;
  }

  // Preload critical above-the-fold images
  preloadCriticalImages() {
    const criticalImages = [
      '/images/spaceNeedle.jpg',
      '/images/limo.jpg',
      '/images/teslaComfort.jpg'
    ];

    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }

  // WebP support detection and conversion
  setupWebPSupport() {
    const webpSupported = this.supportsWebP();
    if (webpSupported) {
      document.documentElement.classList.add('webp');
    }
  }

  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // Progressive image loading
  static createProgressiveImage(src, alt = '', className = '') {
    const container = document.createElement('div');
    container.className = `progressive-image ${className}`;
    
    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    
    const img = document.createElement('img');
    img.dataset.src = src;
    img.alt = alt;
    img.className = 'lazy-image';
    
    container.appendChild(placeholder);
    container.appendChild(img);
    
    return container;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ImageOptimizer();
});

// Export for use in other scripts
window.ImageOptimizer = ImageOptimizer;