// Dark Mode Toggle
const darkModeToggle = document.getElementById("dark-mode-toggle");
const html = document.documentElement;

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
  html.classList.add('dark');
}

darkModeToggle.addEventListener('click', () => {
  html.classList.toggle('dark');
  
  // Save theme preference
  const theme = html.classList.contains('dark') ? 'dark' : 'light';
  localStorage.setItem('theme', theme);
});

// Mobile Menu Toggle
const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");

mobileMenuButton.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

// Navbar Scroll Effect
const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar.classList.add("py-2");
    navbar.classList.remove("py-4");
  } else {
    navbar.classList.add("py-4");
    navbar.classList.remove("py-2");
  }
});

// Typewriter Effect
const typewriterElement = document.getElementById("typewriter");
const phrases = [
  "Web Developer",
  "Mobile App Developer",
  "UI/UX Designer",
  "Software Engineer",
];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

function typeWriter() {
  const currentPhrase = phrases[phraseIndex];

  if (isDeleting) {
    typewriterElement.textContent = currentPhrase.substring(0, charIndex - 1);
    charIndex--;
    typingSpeed = 50;
  } else {
    typewriterElement.textContent = currentPhrase.substring(0, charIndex + 1);
    charIndex++;
    typingSpeed = 100;
  }

  if (!isDeleting && charIndex === currentPhrase.length) {
    isDeleting = true;
    typingSpeed = 1000; // Pause at the end
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    typingSpeed = 500; // Pause before typing next phrase
  }

  setTimeout(typeWriter, typingSpeed);
}

// Start the typewriter effect
setTimeout(typeWriter, 1000);

// Scroll Animation
const animatedElements = document.querySelectorAll(".animated-element");

function checkScroll() {
  animatedElements.forEach((element) => {
    const elementTop = element.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;

    if (elementTop < windowHeight - 100) {
      element.classList.add("fade-in");
    }
  });
}

// Initial check
checkScroll();

// Check on scroll
window.addEventListener("scroll", checkScroll);

// Progress Bars Animation
function animateProgressBars() {
  const progressBars = document.querySelectorAll(".progress-bar");

  progressBars.forEach((bar) => {
    const width = bar.getAttribute("data-width");
    bar.style.width = width + "%";
  });
}

// Animate progress bars when they come into view
const skillsSection = document.getElementById("skills");

function checkSkillsSection() {
  const skillsSectionTop = skillsSection.getBoundingClientRect().top;
  const windowHeight = window.innerHeight;

  if (skillsSectionTop < windowHeight - 100) {
    animateProgressBars();
    window.removeEventListener("scroll", checkSkillsSection);
  }
}

window.addEventListener("scroll", checkSkillsSection);



// Stats Counter Animation
function animateCounters() {
  const statNumbers = document.querySelectorAll(".stat-number");

  statNumbers.forEach((stat) => {
    const target = parseInt(stat.getAttribute("data-count"));
    let count = 0;
    const duration = 2000; // 2 seconds
    const increment = target / (duration / 16); // 60fps

    const counter = setInterval(() => {
      count += increment;

      if (count >= target) {
        stat.textContent = target;
        clearInterval(counter);
      } else {
        stat.textContent = Math.floor(count);
      }
    }, 16);
  });
}

// Animate counters when they come into view
const aboutSection = document.getElementById("about");

function checkAboutSection() {
  const aboutSectionTop = aboutSection.getBoundingClientRect().top;
  const windowHeight = window.innerHeight;

  if (aboutSectionTop < windowHeight - 100) {
    animateCounters();
    window.removeEventListener("scroll", checkAboutSection);
  }
}

window.addEventListener("scroll", checkAboutSection);

// Back to Top Button
const backToTopButton = document.getElementById("back-to-top");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTopButton.classList.add("visible");
  } else {
    backToTopButton.classList.remove("visible");
  }
});

backToTopButton.addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Form Submission
const contactForm = document.getElementById("contact-form");

contactForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Get form values
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;

  // Here you would typically send the form data to a server
  // For this demo, we'll just log it to the console
  console.log("Form submitted:", { name, email, subject, message });

  // Reset the form
  contactForm.reset();

  // Show a success message (in a real application)
  alert("Thank you for your message! I will get back to you soon.");
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();

    const targetId = this.getAttribute("href");

    if (targetId === "#") return;

    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 80, // Adjust for navbar height
        behavior: "smooth",
      });

      // Close mobile menu if open
      if (!mobileMenu.classList.contains("hidden")) {
        mobileMenu.classList.add("hidden");
      }
    }
  });
});

// Active navigation link based on scroll position
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".nav-link");

function setActiveNavLink() {
  let current = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;

    if (window.scrollY >= sectionTop - 100) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${current}`) {
      link.classList.add("active");
    }
  });
}

window.addEventListener("scroll", setActiveNavLink);

// Initial call to set active nav link
setActiveNavLink();
