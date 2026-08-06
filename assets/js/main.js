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
  const sectionNav = document.getElementById('section-nav');
  const sectionProgressBar = document.getElementById('section-progress-bar');
  const prevSectionBtn = document.getElementById('prev-section');
  const nextSectionBtn = document.getElementById('next-section');
  const backToTopBtn = document.getElementById('back-to-top');
  const inertTargets = [heroSection, mainContent].filter(Boolean);
  const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMenuQuery = window.matchMedia('(max-width: 768px)');
  const primarySectionIds = ['hero', 'about', 'research', 'teaching', 'experience', 'contact'];
  const primarySections = primarySectionIds
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const navLinks = document.querySelectorAll('.nav-menu-primary .nav-link[href^="#"]');
  const navSections = Array.from(navLinks)
    .map(link => {
      const href = link.getAttribute('href') || '';
      const id = href.replace('#', '');
      return document.getElementById(id);
    })
    .filter(Boolean);
  let lastFocusedElement = null;
  let publicationAccordionPauseUntil = 0;

  function setNavOffset() {
    if (!navbar) return;
    document.documentElement.style.setProperty('--nav-offset', `${navbar.offsetHeight}px`);
    const sectionNavHeight = sectionNav ? sectionNav.offsetHeight : 0;
    document.documentElement.style.setProperty('--section-nav-offset', `${sectionNavHeight}px`);
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

  const closeMenuOnDesktop = (event) => {
    if (event.matches) return;
    closeMenu(false);
  };
  if (typeof mobileMenuQuery.addEventListener === 'function') {
    mobileMenuQuery.addEventListener('change', closeMenuOnDesktop);
  } else if (typeof mobileMenuQuery.addListener === 'function') {
    mobileMenuQuery.addListener(closeMenuOnDesktop);
  }

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (!navMenu || !navToggle) return;
    if (!navMenu.classList.contains('active')) return;
    if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
      closeMenu(false);
    }
  });

  // --- Active section highlighting + progressive navigation ---
  function setActiveLinkState(links, currentId) {
    links.forEach(link => {
      const isActive = link.getAttribute('href') === `#${currentId}`;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function getCurrentPrimarySectionId() {
    if (navSections.length === 0) return '';
    const navHeight = navbar ? navbar.offsetHeight : 0;
    const sectionNavHeight = sectionNav ? sectionNav.offsetHeight : 0;
    // Determine active nav item from a stable viewport trigger line.
    // This is less sensitive to dynamic content height changes (e.g., accordion expansion).
    const triggerLine = navHeight + sectionNavHeight + Math.max(150, Math.round(window.innerHeight * 0.38));
    const firstRect = navSections[0].getBoundingClientRect();
    if (triggerLine < firstRect.top) return '';

    let activeId = '';
    navSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= triggerLine && rect.bottom > triggerLine) {
        activeId = section.id;
      }
    });

    if (activeId) return activeId;
    const lastSection = navSections[navSections.length - 1];
    return lastSection ? lastSection.id : '';
  }

  function getCurrentPrimarySectionIdForJump() {
    if (primarySections.length === 0) return '';
    const navHeight = navbar ? navbar.offsetHeight : 0;
    const sectionNavHeight = sectionNav ? sectionNav.offsetHeight : 0;
    const aboutSection = document.getElementById('about');
    const triggerLineY = window.scrollY + navHeight + sectionNavHeight + 10;
    if (aboutSection && triggerLineY < aboutSection.offsetTop) {
      return 'hero';
    }
    // Use a near-top trigger so Previous/Next updates promptly after scrolling.
    const scrollPos = triggerLineY;
    let currentId = primarySections[0].id;

    primarySections.forEach(section => {
      if (section.offsetTop <= scrollPos) {
        currentId = section.id;
      }
    });
    return currentId;
  }

  function updateSectionProgress() {
    if (!sectionProgressBar || primarySections.length < 2) return;
    const navHeight = navbar ? navbar.offsetHeight : 0;
    const firstTop = primarySections[0].offsetTop - navHeight;
    const lastTop = primarySections[primarySections.length - 1].offsetTop - navHeight;
    const denominator = Math.max(lastTop - firstTop, 1);
    const ratio = (window.scrollY - firstTop) / denominator;
    const progress = Math.min(Math.max(ratio, 0), 1);
    sectionProgressBar.style.width = `${progress * 100}%`;
  }

  function setJumpButtonState(button, targetId, fallbackText) {
    if (!button) return;
    if (targetId) {
      button.disabled = false;
      button.dataset.target = targetId;
      button.removeAttribute('aria-disabled');
      button.textContent = fallbackText;
    } else {
      button.disabled = true;
      button.dataset.target = '';
      button.setAttribute('aria-disabled', 'true');
      button.textContent = fallbackText;
    }
  }

  function updateSectionJumpControls(currentId) {
    if (primarySections.length === 0) return;
    const currentIndex = primarySections.findIndex(section => section.id === currentId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    const prevId = safeIndex > 0 ? primarySections[safeIndex - 1].id : '';
    const nextId = safeIndex < primarySections.length - 1 ? primarySections[safeIndex + 1].id : '';

    setJumpButtonState(prevSectionBtn, prevId, 'Previous');
    setJumpButtonState(nextSectionBtn, nextId, 'Next');
  }

  function updateBackToTop() {
    if (!backToTopBtn) return;
    const visible = window.scrollY > window.innerHeight * 0.85;
    backToTopBtn.classList.toggle('visible', visible);
    backToTopBtn.setAttribute('aria-hidden', visible ? 'false' : 'true');
    backToTopBtn.tabIndex = visible ? 0 : -1;
  }

  function scrollToSection(targetId, options = {}) {
    const { forJump = false } = options;
    if (!targetId) return;
    let resolvedTargetId = targetId;
    // Guardrail: never allow Hero -> Next to skip About.
    if (forJump && targetId === 'research') {
      const aboutSection = document.getElementById('about');
      const navHeight = navbar ? navbar.offsetHeight : 0;
      if (aboutSection && window.scrollY < (aboutSection.offsetTop - navHeight - 24)) {
        resolvedTargetId = 'about';
      }
    }
    const target = document.getElementById(resolvedTargetId);
    if (!target) return;
    if (forJump) {
      const navHeight = navbar ? navbar.offsetHeight : 0;
      const sectionNavHeight = sectionNav ? sectionNav.offsetHeight : 0;
      const offset = navHeight + sectionNavHeight + 8;
      const targetY = window.scrollY + target.getBoundingClientRect().top - offset;
      window.scrollTo({
        top: Math.max(targetY, 0),
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
      // Ensure controls refresh after smooth scroll settles.
      window.setTimeout(updateActiveSection, prefersReducedMotion ? 0 : 260);
      return;
    }
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  function isHeroActiveForJump() {
    if (!heroSection) return false;
    const navHeight = navbar ? navbar.offsetHeight : 0;
    const sectionNavHeight = sectionNav ? sectionNav.offsetHeight : 0;
    const trigger = navHeight + sectionNavHeight + 20;
    const rect = heroSection.getBoundingClientRect();
    return rect.top <= trigger && rect.bottom > trigger + 40;
  }

  if (prevSectionBtn) {
    prevSectionBtn.addEventListener('click', () => scrollToSection(prevSectionBtn.dataset.target, { forJump: true }));
  }
  if (nextSectionBtn) {
    nextSectionBtn.addEventListener('click', () => {
      if (isHeroActiveForJump()) {
        scrollToSection('about', { forJump: true });
        return;
      }
      scrollToSection(nextSectionBtn.dataset.target, { forJump: true });
    });
  }
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });
  }

  function updateActiveSection() {
    const currentForNav = getCurrentPrimarySectionId();
    const currentForJump = getCurrentPrimarySectionIdForJump();
    setActiveLinkState(navLinks, currentForNav);
    updateSectionProgress();
    updateSectionJumpControls(currentForJump);
    updateBackToTop();
  }

  window.addEventListener('scroll', updateActiveSection, { passive: true });
  window.addEventListener('resize', updateActiveSection, { passive: true });
  window.addEventListener('hashchange', updateActiveSection);
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
    const duration = prefersReducedMotion ? 0 : 1500;
    const startTime = performance.now();

    if (duration === 0) {
      element.textContent = target + suffix;
      return;
    }

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
  function keepPublicationCardInView(card) {
    if (!card) return;
    const navHeight = navbar ? navbar.offsetHeight : 0;
    const sectionNavHeight = sectionNav ? sectionNav.offsetHeight : 0;
    const topOffset = navHeight + sectionNavHeight + 22;
    const rect = card.getBoundingClientRect();
    const cardOverflowsBottom = rect.bottom > window.innerHeight - 28;
    const cardAboveTop = rect.top < topOffset;

    if (!cardOverflowsBottom && !cardAboveTop) return;

    const targetY = window.scrollY + rect.top - topOffset;
    window.scrollTo({
      top: Math.max(targetY, 0),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }

  function closePublicationDetails(card, expandBtn, abstract) {
    if (abstract.hasAttribute('hidden')) return;
    const currentHeight = Math.max(abstract.getBoundingClientRect().height, 0);
    abstract.style.maxHeight = `${currentHeight}px`;
    abstract.style.overflowY = 'hidden';
    void abstract.offsetHeight;
    abstract.style.maxHeight = '0';
    expandBtn.textContent = 'Show Details';
    expandBtn.setAttribute('aria-expanded', 'false');
    card.classList.remove('is-expanded');
    abstract.addEventListener('transitionend', function handler(event) {
      if (event.propertyName !== 'max-height') return;
      if (card.classList.contains('is-expanded')) return;
      abstract.setAttribute('hidden', '');
    }, { once: true });
  }

  function closeExpandedPublicationCardsWithin(categoryRoot) {
    if (!categoryRoot) return;
    categoryRoot.querySelectorAll('.publication-card.is-expanded').forEach(openCard => {
      const otherBtn = openCard.querySelector('.btn-expand');
      const otherAbstract = openCard.querySelector('.pub-abstract');
      if (!otherBtn || !otherAbstract) return;
      closePublicationDetails(openCard, otherBtn, otherAbstract);
    });
  }

  function setPublicationAbstractOpenHeight(abstract) {
    const maxOpenHeight = Math.min(Math.round(window.innerHeight * 0.68), 700);
    const fullHeight = abstract.scrollHeight;
    const openHeight = Math.min(fullHeight, maxOpenHeight);
    abstract.style.maxHeight = `${openHeight}px`;
    abstract.style.overflowY = fullHeight > openHeight + 2 ? 'auto' : 'hidden';
  }

  function openPublicationDetails(card, expandBtn, abstract) {
    const parentGrid = card.closest('.publications-grid');
    if (parentGrid) {
      parentGrid.querySelectorAll('.publication-card.is-expanded').forEach(openCard => {
        if (openCard === card) return;
        const otherBtn = openCard.querySelector('.btn-expand');
        const otherAbstract = openCard.querySelector('.pub-abstract');
        if (!otherBtn || !otherAbstract) return;
        closePublicationDetails(openCard, otherBtn, otherAbstract);
      });
    }

    abstract.removeAttribute('hidden');
    abstract.style.overflowY = 'hidden';
    abstract.style.maxHeight = '0';
    requestAnimationFrame(() => {
      setPublicationAbstractOpenHeight(abstract);
    });
    abstract.addEventListener('transitionend', function handler(event) {
      if (event.propertyName !== 'max-height') return;
      if (abstract.hasAttribute('hidden')) return;
      setPublicationAbstractOpenHeight(abstract);
      keepPublicationCardInView(card);
    }, { once: true });
    card.classList.add('is-expanded');
    expandBtn.textContent = 'Hide Details';
    expandBtn.setAttribute('aria-expanded', 'true');
  }

  document.querySelectorAll('.publication-card').forEach((card, index) => {
    const expandBtn = card.querySelector('.btn-expand');
    const abstract = card.querySelector('.pub-abstract');
    if (!expandBtn || !abstract) return;
    card.classList.add('has-abstract');
    card.classList.toggle('is-expanded', !abstract.hasAttribute('hidden'));
    if (!abstract.id) {
      abstract.id = `pub-abstract-${index + 1}`;
    }
    expandBtn.setAttribute('aria-controls', abstract.id);

    expandBtn.addEventListener('click', () => {
      const isHidden = abstract.hasAttribute('hidden');
      publicationAccordionPauseUntil = Date.now() + (isHidden ? 1200 : 700);

      if (isHidden) {
        openPublicationDetails(card, expandBtn, abstract);
      } else {
        closePublicationDetails(card, expandBtn, abstract);
      }
    });
  });

  // --- Research subsections: flat layout with simple chip jump-links ---
  const researchSection = document.getElementById('research');
  const researchCategories = researchSection
    ? Array.from(researchSection.querySelectorAll('.research-category'))
    : [];
  const researchChips = researchSection
    ? Array.from(researchSection.querySelectorAll('.section-chip[href^="#research-"]'))
    : [];

  if (researchCategories.length > 0) {
    function getResearchIndexById(categoryId) {
      return researchCategories.findIndex(category => category.id === categoryId);
    }

    function updateResearchChipState() {
      const navHeight = navbar ? navbar.offsetHeight : 0;
      const sectionNavHeight = sectionNav ? sectionNav.offsetHeight : 0;
      const triggerLine = navHeight + sectionNavHeight + 84;
      const sectionRect = researchSection.getBoundingClientRect();
      const sectionIsActive = sectionRect.top < window.innerHeight * 0.68
        && sectionRect.bottom > triggerLine + 24;

      if (!sectionIsActive) {
        setActiveLinkState(researchChips, '');
        return;
      }

      let currentId = researchCategories[0].id;
      researchCategories.forEach(category => {
        if (category.getBoundingClientRect().top <= triggerLine + 18) {
          currentId = category.id;
        }
      });
      setActiveLinkState(researchChips, currentId);
    }

    researchChips.forEach(chip => {
      chip.addEventListener('click', (event) => {
        event.preventDefault();
        const targetId = chip.getAttribute('href').replace('#', '');
        const targetIndex = getResearchIndexById(targetId);
        if (targetIndex < 0) return;
        if (window.location.hash !== `#${targetId}`) {
          history.replaceState(null, '', `#${targetId}`);
        }
        scrollToSection(targetId, { forJump: true });
      });
    });

    window.addEventListener('scroll', updateResearchChipState, { passive: true });
    window.addEventListener('resize', updateResearchChipState, { passive: true });
    window.addEventListener('hashchange', updateResearchChipState);
    updateResearchChipState();
  }

  // --- Teaching course card expand/collapse ---
  document.querySelectorAll('.course-card').forEach((card, index) => {
    const toggle = card.querySelector('.course-toggle');
    const details = card.querySelector('.course-details');
    if (!toggle || !details) return;
    const closedLabel = 'Course Description';
    const openLabel = 'Hide Course Description';

    if (!details.id) {
      details.id = `course-details-${index + 1}`;
    }
    toggle.setAttribute('aria-controls', details.id);

    const isInitiallyOpen = !details.hasAttribute('hidden');
    card.classList.toggle('is-open', isInitiallyOpen);
    toggle.setAttribute('aria-expanded', isInitiallyOpen ? 'true' : 'false');
    toggle.textContent = isInitiallyOpen ? openLabel : closedLabel;

    toggle.addEventListener('click', () => {
      const isHidden = details.hasAttribute('hidden');

      if (isHidden) {
        details.removeAttribute('hidden');
        card.classList.add('is-open');
        if (prefersReducedMotion) {
          details.style.maxHeight = 'none';
          toggle.setAttribute('aria-expanded', 'true');
          toggle.textContent = openLabel;
          return;
        }
        details.style.maxHeight = '0';
        requestAnimationFrame(() => {
          details.style.maxHeight = `${details.scrollHeight}px`;
        });
        details.addEventListener('transitionend', function handler(event) {
          if (event.propertyName !== 'max-height') return;
          if (details.hasAttribute('hidden')) return;
          details.style.maxHeight = 'none';
        }, { once: true });
        toggle.setAttribute('aria-expanded', 'true');
        toggle.textContent = openLabel;
      } else {
        if (prefersReducedMotion) {
          details.style.maxHeight = '0';
          details.setAttribute('hidden', '');
          card.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.textContent = closedLabel;
          return;
        }
        if (details.style.maxHeight === 'none' || !details.style.maxHeight) {
          details.style.maxHeight = `${details.scrollHeight}px`;
          void details.offsetHeight;
        }
        details.style.maxHeight = '0';
        card.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = closedLabel;
        details.addEventListener('transitionend', function handler(event) {
          if (event.propertyName !== 'max-height') return;
          if (card.classList.contains('is-open')) return;
          details.setAttribute('hidden', '');
        }, { once: true });
      }
    });
  });

  // --- Teaching subsection chip highlighting ---
  const teachingSection = document.getElementById('teaching');
  const teachingChipNav = teachingSection
    ? teachingSection.querySelector('.teaching-chips')
    : null;
  const teachingChips = teachingSection
    ? Array.from(teachingSection.querySelectorAll('.teaching-chips .section-chip[href^="#teaching-"]'))
    : [];
  const teachingTargets = teachingChips
    .map(chip => {
      const id = chip.getAttribute('href').replace('#', '');
      return document.getElementById(id);
    })
    .filter(Boolean);

  if (teachingSection && teachingChipNav && teachingChips.length > 0 && teachingTargets.length > 0) {
    function updateTeachingChipState() {
      const navHeight = navbar ? navbar.offsetHeight : 0;
      const sectionNavHeight = sectionNav ? sectionNav.offsetHeight : 0;
      const triggerLine = navHeight + sectionNavHeight + 84;
      const sectionRect = teachingSection.getBoundingClientRect();
      const sectionIsActive = sectionRect.top < window.innerHeight * 0.68
        && sectionRect.bottom > triggerLine + 24;

      if (!sectionIsActive) {
        setActiveLinkState(teachingChips, '');
        return;
      }

      let currentId = '';
      const firstTop = teachingTargets[0].getBoundingClientRect().top;
      if (firstTop <= triggerLine + 8) {
        currentId = teachingTargets[0].id;
      }

      teachingTargets.forEach((target, index) => {
        if (index === 0) return;
        if (target.getBoundingClientRect().top <= triggerLine + 18) {
          currentId = target.id;
        }
      });

      setActiveLinkState(teachingChips, currentId);
    }

    window.addEventListener('scroll', updateTeachingChipState, { passive: true });
    window.addEventListener('resize', updateTeachingChipState, { passive: true });
    window.addEventListener('hashchange', updateTeachingChipState);
    updateTeachingChipState();
  }

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
        embed.addEventListener('transitionend', function handler(event) {
          if (event.propertyName !== 'max-height') return;
          if (embed.hasAttribute('hidden')) return;
          embed.style.maxHeight = 'none';
        }, { once: true });
        toggle.setAttribute('aria-expanded', 'true');
      } else {
        card.classList.remove('is-open');
        if (embed.style.maxHeight === 'none') {
          embed.style.maxHeight = embed.scrollHeight + 'px';
          void embed.offsetHeight;
        }
        embed.style.maxHeight = '0';
        toggle.setAttribute('aria-expanded', 'false');
        embed.addEventListener('transitionend', function handler(event) {
          if (event.propertyName !== 'max-height') return;
          embed.setAttribute('hidden', '');
        }, { once: true });
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
