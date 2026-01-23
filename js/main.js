/**
 * 999 Gallery - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  initGarageDoor();
  initMobileMenu();
  initLightbox();
  initArchiveFilters();
  initFileUpload();
  initExhibitionModal();
  initImageCarousel();

  // Load exhibition data from CMS-generated JSON
  loadExhibitionData();
});

/**
 * Image Carousel - Auto-rotating slideshow
 */
function initImageCarousel() {
  const carousel = document.getElementById('about-carousel');
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.carousel-slide');
  if (slides.length <= 1) return;

  let currentIndex = 0;
  const intervalTime = 4000; // 4 seconds between slides

  function showNextSlide() {
    slides[currentIndex].classList.remove('active');
    currentIndex = (currentIndex + 1) % slides.length;
    slides[currentIndex].classList.add('active');
  }

  // Start auto-rotation
  setInterval(showNextSlide, intervalTime);
}

/**
 * Load exhibition data and render pages
 */
async function loadExhibitionData() {
  try {
    const response = await fetch('/data/exhibitions.json');
    if (!response.ok) return; // File doesn't exist yet (pre-build)

    const data = await response.json();

    // Determine which page we're on and render accordingly
    const path = window.location.pathname;

    if (path === '/' || path === '/index.html') {
      renderHomePage(data);
    } else if (path.startsWith('/archive')) {
      renderArchivePage(data);
    } else if (path.startsWith('/current')) {
      renderCurrentPage(data);
    }
  } catch (e) {
    // Data file not available, pages will use static content
    console.log('Exhibition data not loaded, using static content');
  }
}

/**
 * Render home page with exhibition data
 */
function renderHomePage(data) {
  // Update featured exhibition
  if (data.current) {
    const featuredTitle = document.querySelector('.featured-title');
    const featuredDates = document.querySelector('.featured-dates');
    const featuredImage = document.querySelector('.featured-image-large');

    if (featuredTitle) featuredTitle.textContent = data.current.title;
    if (featuredDates) featuredDates.textContent = data.current.dates;
    if (featuredImage) {
      featuredImage.src = data.current.featuredImage;
      featuredImage.alt = data.current.title;
    }
  }

  // Update "Recent Work" masonry gallery with artwork from all exhibitions
  const masonry = document.querySelector('.masonry');
  if (!masonry) return;

  // Collect recent artwork from all exhibitions (limit to 6)
  const recentArtwork = [];
  for (const exhibition of data.exhibitions) {
    for (const art of exhibition.artwork) {
      recentArtwork.push(art);
      if (recentArtwork.length >= 6) break;
    }
    if (recentArtwork.length >= 6) break;
  }

  // Render masonry items
  masonry.innerHTML = recentArtwork.map(art => `
    <div class="masonry-item" data-title="${art.title}" data-artist="${art.artist}" data-medium="${art.medium}">
      <img src="${art.src}" alt="${art.title}">
      <div class="masonry-item-overlay">
        <p class="masonry-item-title">${art.title}</p>
        <p class="masonry-item-meta">${art.artist}</p>
      </div>
    </div>
  `).join('');

  // Re-initialize lightbox for new items
  initLightbox();
}

/**
 * Render archive page with exhibition data
 */
function renderArchivePage(data) {
  const filtersContainer = document.getElementById('archive-filters');
  const gridContainer = document.getElementById('archive-grid');

  if (!filtersContainer || !gridContainer) return;

  // Get past exhibitions (not current)
  const pastExhibitions = data.exhibitions.filter(e => !e.isCurrent);

  // Build year filters
  const years = [...new Set(pastExhibitions.map(e => e.year))].sort((a, b) => b - a);
  filtersContainer.innerHTML = `
    <button class="filter-btn active" data-year="all">All</button>
    ${years.map(year => `<button class="filter-btn" data-year="${year}">${year}</button>`).join('')}
  `;

  // Build exhibition cards
  gridContainer.innerHTML = pastExhibitions.map(exhibition => `
    <article
      class="card card--clickable"
      data-year="${exhibition.year}"
      data-exhibition-slug="${exhibition.slug}"
      tabindex="0"
      role="button"
      aria-label="View ${exhibition.title} artwork"
    >
      <img
        src="${exhibition.featuredImage}"
        alt="${exhibition.title}"
        class="card-image"
      >
      <div class="card-content">
        <h3 class="card-title">${exhibition.title}</h3>
        <p class="card-meta">${exhibition.dates}</p>
        <p class="card-description">${exhibition.description.split('\n')[0]}</p>
      </div>
    </article>
  `).join('');

  // Store exhibition data for modal
  window.exhibitionsData = {};
  pastExhibitions.forEach(e => {
    window.exhibitionsData[e.slug] = e;
  });

  // Re-initialize filters and modal
  initArchiveFilters();
  initArchiveModal();
}

/**
 * Initialize archive modal for dynamically loaded content
 */
function initArchiveModal() {
  const modal = document.getElementById('exhibition-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDates = document.getElementById('modal-dates');
  const modalDescription = document.getElementById('modal-description');
  const modalGallery = document.getElementById('modal-gallery');
  const closeBtn = modal?.querySelector('.exhibition-modal-close');
  const cards = document.querySelectorAll('.card--clickable');

  if (!modal || !cards.length) return;

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.dataset.exhibitionSlug;
      const exhibition = window.exhibitionsData?.[slug];

      if (!exhibition) return;

      modalTitle.textContent = exhibition.title;
      modalDates.textContent = exhibition.dates;
      modalDescription.textContent = exhibition.description;

      modalGallery.innerHTML = exhibition.artwork.map(art => `
        <div class="masonry-item"
             data-title="${art.title}"
             data-artist="${art.artist}"
             data-medium="${art.medium}"
             tabindex="0"
             role="button">
          <img src="${art.src}" alt="${art.title}">
          <div class="masonry-item-overlay">
            <p class="masonry-item-title">${art.title}</p>
            <p class="masonry-item-meta">${art.artist}</p>
          </div>
        </div>
      `).join('');

      initModalLightboxGlobal(modalGallery);

      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      closeBtn?.focus();
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

/**
 * Global lightbox initializer for dynamic content
 */
function initModalLightboxGlobal(container) {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.querySelector('.lightbox-close');
  const items = container.querySelectorAll('.masonry-item');

  if (!lightbox || !items.length) return;

  items.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const img = item.querySelector('img');
      if (!img) return;

      lightboxImage.src = img.src;
      lightboxImage.alt = img.alt;

      const title = item.dataset.title || img.alt;
      const artist = item.dataset.artist || '';
      const medium = item.dataset.medium || '';

      let caption = `<strong>${title}</strong>`;
      if (artist) caption += `<br>${artist}`;
      if (medium) caption += `<br><em>${medium}</em>`;

      lightboxCaption.innerHTML = caption;
      lightbox.classList.add('is-open');
      lightboxClose?.focus();
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });
}

/**
 * Render current exhibition page
 */
function renderCurrentPage(data) {
  if (!data.current) return;

  const exhibition = data.current;

  // Update hero image
  const heroImage = document.querySelector('.exhibition-hero-image');
  if (heroImage) {
    heroImage.src = exhibition.featuredImage;
    heroImage.alt = exhibition.title;
  }

  // Update title and dates
  const title = document.querySelector('.exhibition-title');
  const dates = document.querySelector('.exhibition-dates');

  if (title) title.textContent = exhibition.title;
  if (dates) dates.textContent = exhibition.dates;

  // Update description
  const descriptionContainer = document.querySelector('.exhibition-info:not(.text-center)');
  if (descriptionContainer && exhibition.descriptionHtml) {
    descriptionContainer.innerHTML = exhibition.descriptionHtml;
  }

  // Update artwork gallery
  const gallery = document.getElementById('artwork-gallery');
  if (gallery) {
    gallery.innerHTML = exhibition.artwork.map(art => `
      <div class="masonry-item" data-title="${art.title}" data-artist="${art.artist}" data-medium="${art.medium}">
        <img src="${art.src}" alt="${art.title}">
        <div class="masonry-item-overlay">
          <p class="masonry-item-title">${art.title}</p>
          <p class="masonry-item-meta">${art.artist}</p>
        </div>
      </div>
    `).join('');

    // Re-initialize lightbox
    initLightbox();
  }
}

/**
 * Garage Door Scroll Animation
 */
function initGarageDoor() {
  const intro = document.getElementById('garage-intro');
  const door = document.getElementById('garage-door');
  const header = document.getElementById('site-header');
  const content = document.querySelector('.garage-content');

  if (!intro || !door) return;

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    intro.style.display = 'none';
    return;
  }

  // Hide header initially
  if (header) header.classList.add('is-hidden');

  // Track scroll position
  let ticking = false;
  const scrollDistance = window.innerHeight * 0.8; // Door fully opens after 80vh of scroll

  function updateDoor() {
    const scrollY = window.scrollY;
    const progress = Math.min(scrollY / scrollDistance, 1);

    // Move door up (translate Y from 0 to -100%)
    const doorY = -progress * 100;
    door.style.transform = `translateY(${doorY}%)`;

    // Fade out the text content
    if (content) {
      content.style.opacity = 1 - progress * 2; // Fades out in first half of scroll
    }

    // Show header when door is mostly open
    if (header) {
      if (progress > 0.7) {
        header.classList.remove('is-hidden');
      } else {
        header.classList.add('is-hidden');
      }
    }

    // Hide intro completely when animation is done
    if (progress >= 1) {
      intro.classList.add('is-complete');
    } else {
      intro.classList.remove('is-complete');
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateDoor);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial state
  updateDoor();

  // Handle resize
  window.addEventListener('resize', () => {
    updateDoor();
  }, { passive: true });
}

/**
 * Mobile Menu
 */
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.textContent = isOpen ? 'Close' : 'Menu';
  });

  // Close on link click
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Menu';
    });
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Menu';
    }
  });
}

/**
 * Lightbox
 */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.querySelector('.lightbox-close');
  const items = document.querySelectorAll('.masonry-item');

  if (!lightbox || !items.length) return;

  items.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (!img) return;

      lightboxImage.src = img.src;
      lightboxImage.alt = img.alt;

      // Build caption
      const title = item.dataset.title || img.alt;
      const artist = item.dataset.artist || '';
      const medium = item.dataset.medium || '';

      let caption = `<strong>${title}</strong>`;
      if (artist) caption += `<br>${artist}`;
      if (medium) caption += `<br><em>${medium}</em>`;

      lightboxCaption.innerHTML = caption;
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    });

    // Keyboard support
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    lightboxImage.src = '';
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });
}

/**
 * Archive Filters
 */
function initArchiveFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.card[data-year]');

  if (!buttons.length || !cards.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const year = btn.dataset.year;

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      cards.forEach(card => {
        if (year === 'all' || card.dataset.year === year) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/**
 * File Upload UI
 */
function initFileUpload() {
  const area = document.getElementById('file-upload-area');
  const input = document.getElementById('artwork-images');
  const list = document.getElementById('file-list');

  if (!area || !input) return;

  area.addEventListener('click', () => input.click());

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.style.borderColor = 'var(--color-text)';
  });

  area.addEventListener('dragleave', () => {
    area.style.borderColor = '';
  });

  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.style.borderColor = '';
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      updateList(input.files);
    }
  });

  input.addEventListener('change', () => updateList(input.files));

  function updateList(files) {
    if (!list) return;
    if (!files.length) {
      list.textContent = '';
      return;
    }
    const names = Array.from(files).map(f => f.name);
    list.textContent = files.length <= 3
      ? names.join(', ')
      : `${files.length} files selected`;
  }
}

/**
 * Exhibition Modal (Archive page)
 */
function initExhibitionModal() {
  const modal = document.getElementById('exhibition-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDates = document.getElementById('modal-dates');
  const modalDescription = document.getElementById('modal-description');
  const modalGallery = document.getElementById('modal-gallery');
  const closeBtn = modal?.querySelector('.exhibition-modal-close');
  const dataScript = document.getElementById('exhibitions-data');
  const cards = document.querySelectorAll('.card--clickable');

  if (!modal || !dataScript || !cards.length) return;

  // Parse exhibition data
  let exhibitionsData = {};
  try {
    exhibitionsData = JSON.parse(dataScript.textContent);
  } catch (e) {
    console.error('Failed to parse exhibitions data:', e);
    return;
  }

  // Open modal on card click
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const exhibitionId = card.dataset.exhibitionId;
      const exhibition = exhibitionsData[exhibitionId];

      if (!exhibition) return;

      // Populate modal
      modalTitle.textContent = exhibition.title;
      modalDates.textContent = exhibition.dates;
      modalDescription.textContent = exhibition.description;

      // Build gallery
      modalGallery.innerHTML = exhibition.artwork.map(art => `
        <div class="masonry-item"
             data-title="${art.title}"
             data-artist="${art.artist}"
             data-medium="${art.medium}"
             tabindex="0"
             role="button">
          <img src="${art.src}" alt="${art.title}">
          <div class="masonry-item-overlay">
            <p class="masonry-item-title">${art.title}</p>
            <p class="masonry-item-meta">${art.artist}</p>
          </div>
        </div>
      `).join('');

      // Initialize lightbox for new gallery items
      initModalLightbox();

      // Open modal
      modal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      closeBtn?.focus();
    });

    // Keyboard support for cards
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Close modal
  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  // Lightbox for modal gallery images
  function initModalLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.querySelector('.lightbox-close');
    const items = modalGallery.querySelectorAll('.masonry-item');

    if (!lightbox || !items.length) return;

    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const img = item.querySelector('img');
        if (!img) return;

        lightboxImage.src = img.src;
        lightboxImage.alt = img.alt;

        const title = item.dataset.title || img.alt;
        const artist = item.dataset.artist || '';
        const medium = item.dataset.medium || '';

        let caption = `<strong>${title}</strong>`;
        if (artist) caption += `<br>${artist}`;
        if (medium) caption += `<br><em>${medium}</em>`;

        lightboxCaption.innerHTML = caption;
        lightbox.classList.add('is-open');
        lightboxClose?.focus();
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.click();
        }
      });
    });

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightboxImage.src = '';
    }

    lightboxClose?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLightbox();
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
}
