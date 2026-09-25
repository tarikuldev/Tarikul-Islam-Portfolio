"use strict";

// Public Supabase Edge Function URL (not a secret). See supabase/README.md.
const CONTACT_ENDPOINT =
  "https://hqzbguidhxppltpyqmzz.supabase.co/functions/v1/contact";
const CONTACT_TIMEOUT_MS = 15000;
const SUBMIT_COOLDOWN_MS = 30000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAVBAR_OFFSET = 80; // Fixed navbar height used when scrolling to sections
const REVEAL_OFFSET = 100; // How far into the viewport an element must be to animate in

const TYPEWRITER_PHRASES = [
  "Web Developer",
  "Mobile App Developer",
  "UI/UX Designer",
  "Software Engineer",
];

// Dark mode toggle. The saved theme is applied by an inline script in <head>.
function initThemeToggle() {
  const root = document.documentElement;
  const toggle = document.getElementById("dark-mode-toggle");

  toggle.setAttribute("aria-pressed", String(root.classList.contains("dark")));

  toggle.addEventListener("click", () => {
    const isDark = root.classList.toggle("dark");
    toggle.setAttribute("aria-pressed", String(isDark));
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // Storage unavailable: the theme still applies for this visit.
    }
  });
}

// Mobile menu. Returns a function that closes the menu.
function initMobileMenu() {
  const button = document.getElementById("mobile-menu-button");
  const menu = document.getElementById("mobile-menu");

  const setOpen = (open) => {
    menu.classList.toggle("hidden", !open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };

  button.addEventListener("click", () => {
    setOpen(menu.classList.contains("hidden"));
  });

  return () => setOpen(false);
}

// Smooth scrolling for in-page links, offset for the fixed navbar.
// A bare "#" link (logo, back-to-top) scrolls to the top.
function initSmoothScroll(closeMobileMenu) {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    event.preventDefault();

    const targetId = link.getAttribute("href");
    if (targetId === "#") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = document.querySelector(targetId);
    if (!target) return;

    window.scrollTo({
      top: target.offsetTop - NAVBAR_OFFSET,
      behavior: "smooth",
    });
    closeMobileMenu();
  });
}

function initTypewriter() {
  const element = document.getElementById("typewriter");
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function tick() {
    const phrase = TYPEWRITER_PHRASES[phraseIndex];
    charIndex += isDeleting ? -1 : 1;
    element.textContent = phrase.substring(0, charIndex);

    let delay = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === phrase.length) {
      isDeleting = true;
      delay = 1000; // Pause at the end of a phrase
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % TYPEWRITER_PHRASES.length;
      delay = 500; // Pause before the next phrase
    }

    setTimeout(tick, delay);
  }

  setTimeout(tick, 1000);
}

function animateProgressBars() {
  document.querySelectorAll(".progress-bar").forEach((bar) => {
    bar.style.width = `${bar.dataset.width}%`;
  });
}

function animateCounters() {
  const duration = 2000;

  document.querySelectorAll(".stat-number").forEach((stat) => {
    const target = Number(stat.dataset.count) || 0;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      stat.textContent = Math.floor(target * progress);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  });
}

// All scroll-driven behaviour in one passive, frame-throttled listener.
function initScrollEffects() {
  const navbar = document.getElementById("navbar");
  const backToTop = document.getElementById("back-to-top");
  const skillsSection = document.getElementById("skills");
  const aboutSection = document.getElementById("about");
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-link");

  let pendingReveals = [...document.querySelectorAll(".animated-element")];
  let progressBarsStarted = false;
  let countersStarted = false;
  let frameRequested = false;

  const isInView = (element) =>
    element.getBoundingClientRect().top < window.innerHeight - REVEAL_OFFSET;

  function revealElements() {
    pendingReveals = pendingReveals.filter((element) => {
      if (!isInView(element)) return true;
      element.classList.add("fade-in");
      return false;
    });
  }

  function updateActiveNavLink(scrollY) {
    let currentId = "";
    sections.forEach((section) => {
      if (scrollY >= section.offsetTop - 100) currentId = section.id;
    });

    navLinks.forEach((link) => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${currentId}`
      );
    });
  }

  function update() {
    frameRequested = false;
    const { scrollY } = window;

    navbar.classList.toggle("py-2", scrollY > 50);
    navbar.classList.toggle("py-4", scrollY <= 50);
    backToTop.classList.toggle("visible", scrollY > 300);

    if (pendingReveals.length) revealElements();

    if (!progressBarsStarted && isInView(skillsSection)) {
      progressBarsStarted = true;
      animateProgressBars();
    }
    if (!countersStarted && isInView(aboutSection)) {
      countersStarted = true;
      animateCounters();
    }

    updateActiveNavLink(scrollY);
  }

  window.addEventListener(
    "scroll",
    () => {
      if (frameRequested) return;
      frameRequested = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );

  update();
}

// Fetch with a timeout that also works where AbortSignal.timeout is missing.
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Contact form: validates, then posts to the Supabase Edge Function, which
// re-validates, rate-limits and stores the message server-side.
function initContactForm() {
  const form = document.getElementById("contact-form");
  const submitButton = form.querySelector('button[type="submit"]');
  let isSubmitting = false;
  let lastSubmittedAt = 0;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) return;
    if (Date.now() - lastSubmittedAt < SUBMIT_COOLDOWN_MS) {
      alert(
        "Your message was already sent. Please wait a moment before sending another."
      );
      return;
    }

    const { elements } = form;
    const payload = {
      name: elements.name.value.trim(),
      email: elements.email.value.trim(),
      subject: elements.subject.value.trim(),
      message: elements.message.value.trim(),
      website: elements.website.value, // Honeypot: real visitors leave it empty
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      alert("Please fill in all fields.");
      return;
    }
    if (!EMAIL_PATTERN.test(payload.email)) {
      alert("Please enter a valid email address.");
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    form.setAttribute("aria-busy", "true");

    try {
      const response = await fetchWithTimeout(
        CONTACT_ENDPOINT,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        CONTACT_TIMEOUT_MS
      );

      if (response.status === 429) {
        alert("Too many messages sent. Please try again in a few minutes.");
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      lastSubmittedAt = Date.now();
      form.reset();
      alert("Thank you for your message! I will get back to you soon.");
    } catch (error) {
      console.error("Contact form error:", error);
      alert("Sorry, your message could not be sent. Please try again later.");
    } finally {
      isSubmitting = false;
      submitButton.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });
}

initThemeToggle();
initSmoothScroll(initMobileMenu());
initTypewriter();
initScrollEffects();
initContactForm();
