/* ============================================================
   Main Interactions — jseward.com
   Navigation, scroll effects, counters, publication cards
   ============================================================ */

(function () {
  'use strict';

  // --- Navbar + mobile navigation ---
  const navbar = document.getElementById('navbar');
  const heroSection = document.getElementById('hero');
  const mainContent = document.getElementById('main-content');
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  const inertTargets = [heroSection, mainContent].filter(Boolean);
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastFocusedElement = null;

  function setNavOffset() {
    if (!navbar) return;
    document.documentElement.style.setProperty('--nav-offset', `${navbar.offsetHeight}px`);
  }

  function updateNavbar() {
    if (!navbar) return;
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    setNavOffset();
  }

  window.addEventListener('scroll', updateNavbar, { passive: true });
  window.addEventListener('resize', setNavOffset, { passive: true });
  setNavOffset();
  updateNavbar();

  function setBackgroundInert(isInert) {
    inertTargets.forEach(target => {
      if ('inert' in target) {
        target.inert = isInert;
      } else if (isInert) {
        target.setAttribute('aria-hidden', 'true');
      } else {
        target.removeAttribute('aria-hidden');
      }
    });
  }

  function getMenuFocusableElements() {
    if (!navMenu) return [];
    return Array.from(navMenu.querySelectorAll(focusableSelector));
  }

  function openMenu() {
    if (!navMenu || !navToggle) return;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    navMenu.classList.add('active');
    navToggle.classList.add('active');
    navToggle.setAttribute('aria-expanded', 'true');
    navMenu.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
    setBackgroundInert(true);

    const focusable = getMenuFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }

  function closeMenu(returnFocus = false) {
    if (!navMenu || !navToggle) return;
    if (!navMenu.classList.contains('active')) return;

    navMenu.classList.remove('active');
    navToggle.classList.remove('active');
    navToggle.setAttribute('aria-expanded', 'false');
    navMenu.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
    setBackgroundInert(false);

    if (returnFocus) {
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      } else {
        navToggle.focus();
      }
    }
    lastFocusedElement = null;
  }

  function trapFocusInMenu(event) {
    if (!navMenu || !navMenu.classList.contains('active')) return;
    const focusable = getMenuFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      navToggle.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (navMenu) {
    navMenu.setAttribute('aria-hidden', 'true');
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      if (navMenu.classList.contains('active')) {
        closeMenu(true);
      } else {
        openMenu();
      }
    });

    // Preserve native hash behavior, only close mobile menu on in-page link clicks.
    navMenu.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', () => closeMenu(false));
    });
  }

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (!navMenu || !navToggle) return;
    if (!navMenu.classList.contains('active')) return;
    if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
      closeMenu(false);
    }
  });

  // --- Active section highlighting ---
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActiveSection() {
    const scrollPos = window.scrollY + navbar.offsetHeight + 100;

    let current = '';
    sections.forEach(section => {
      if (section.offsetTop <= scrollPos) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveSection, { passive: true });
  updateActiveSection();

  // --- Scroll-triggered fade-in animations ---
  const fadeElements = document.querySelectorAll('.fade-in-on-scroll');

  if ('IntersectionObserver' in window) {
    const fadeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    fadeElements.forEach(el => fadeObserver.observe(el));
  } else {
    // Fallback: show everything
    fadeElements.forEach(el => el.classList.add('visible'));
  }

  // --- Animated counters ---
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');

  function animateCounter(element) {
    const target = parseInt(element.dataset.target, 10);
    const suffix = element.dataset.suffix || '';
    const duration = 1500;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      element.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    statNumbers.forEach(el => counterObserver.observe(el));
  } else {
    statNumbers.forEach(el => {
      el.textContent = el.dataset.target + (el.dataset.suffix || '');
    });
  }

  // --- Publication card expand/collapse ---
  document.querySelectorAll('.publication-card').forEach((card, index) => {
    const expandBtn = card.querySelector('.btn-expand');
    const abstract = card.querySelector('.pub-abstract');
    if (!expandBtn || !abstract) return;
    if (!abstract.id) {
      abstract.id = `pub-abstract-${index + 1}`;
    }
    expandBtn.setAttribute('aria-controls', abstract.id);

    expandBtn.addEventListener('click', () => {
      const isHidden = abstract.hasAttribute('hidden');

      if (isHidden) {
        abstract.removeAttribute('hidden');
        // Trigger reflow then set max-height
        abstract.style.maxHeight = '0';
        requestAnimationFrame(() => {
          abstract.style.maxHeight = abstract.scrollHeight + 200 + 'px';
        });
        expandBtn.textContent = 'Hide Details';
        expandBtn.setAttribute('aria-expanded', 'true');
      } else {
        abstract.style.maxHeight = '0';
        expandBtn.textContent = 'Show Details';
        expandBtn.setAttribute('aria-expanded', 'false');
        // After transition, hide
        abstract.addEventListener('transitionend', function handler(event) {
          if (event.propertyName !== 'max-height') return;
          abstract.setAttribute('hidden', '');
          abstract.removeEventListener('transitionend', handler);
        });
      }
    });
  });

  // --- Slide card expand/collapse ---
  document.querySelectorAll('.slide-card-expandable').forEach((card, index) => {
    const toggle = card.querySelector('.slide-card-toggle');
    const embed = card.querySelector('.slide-embed');
    if (!toggle || !embed) return;
    if (!embed.id) {
      embed.id = `slide-embed-${index + 1}`;
    }
    toggle.setAttribute('aria-controls', embed.id);

    toggle.addEventListener('click', () => {
      const isHidden = embed.hasAttribute('hidden');

      if (isHidden) {
        // Lazy-load iframe
        const iframe = embed.querySelector('iframe');
        if (iframe && iframe.dataset.src && !iframe.src) {
          iframe.src = iframe.dataset.src;
        }
        card.classList.add('is-open');
        embed.removeAttribute('hidden');
        embed.style.maxHeight = '0';
        requestAnimationFrame(() => {
          embed.style.maxHeight = embed.scrollHeight + 'px';
        });
        toggle.setAttribute('aria-expanded', 'true');
      } else {
        card.classList.remove('is-open');
        embed.style.maxHeight = '0';
        toggle.setAttribute('aria-expanded', 'false');
        embed.addEventListener('transitionend', function handler(event) {
          if (event.propertyName !== 'max-height') return;
          embed.setAttribute('hidden', '');
          embed.removeEventListener('transitionend', handler);
        });
      }
    });
  });

  // --- Keyboard navigation ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu && navMenu.classList.contains('active')) {
      e.preventDefault();
      closeMenu(true);
      return;
    }

    if (e.key === 'Tab') {
      trapFocusInMenu(e);
    }
  });

})();
