const root = document.documentElement;
const body = document.body;
const loader = document.querySelector(".loader");
const cursorDot = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const backToTop = document.querySelector(".back-to-top");
const robot = document.querySelector("#robot");
const robotStage = document.querySelector("#robotStage");
const robotCore = document.querySelector("#robotCore");
const robotStatusText = document.querySelector(".robot-status-text");
const robotLaserBeam = document.querySelector("#robotLaserBeam");
const robotLaserImpact = document.querySelector("#robotLaserImpact");
const greetingLabel = document.querySelector("#greetingLabel");
const timeLabel = document.querySelector("#timeLabel");
const dateLabel = document.querySelector("#dateLabel");
const pupils = document.querySelectorAll(".pupil");
const skillCards = document.querySelectorAll(".skill-card");
const counters = document.querySelectorAll(".counter");
const sections = document.querySelectorAll("section[id]");
const navAnchors = document.querySelectorAll(".nav-links a");
const canvas = document.querySelector("#particleCanvas");
const ctx = canvas.getContext("2d");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = document.querySelectorAll(".reveal, .stat-card, .skill-card");
const internalAnchors = document.querySelectorAll('a[href^="#"]');
const deviceMemory = navigator.deviceMemory || 8;
const hardwareThreads = navigator.hardwareConcurrency || 8;
const liteMode = prefersReducedMotion || deviceMemory <= 4 || hardwareThreads <= 4 || window.innerWidth < 980;
let lastScrollY = window.scrollY;
let scrollDirection = "down";
let ticking = false;
let smoothScrollFrame = 0;
let pointerFrame = 0;
let latestPointerEvent = null;
let laserInterval = 0;
let laserKickoffTimeout = 0;
let laserCleanupTimeout = 0;

revealItems.forEach((item) => item.classList.add("reveal"));
revealItems.forEach((item, index) => {
  item.style.setProperty("--reveal-delay", `${Math.min(index * 20, 120)}ms`);
});

body.classList.add("loading");
body.classList.toggle("performance-lite", liteMode);

window.addEventListener("load", () => {
  setTimeout(() => {
    loader.classList.add("hidden");
    body.classList.remove("loading");
  }, 650);
});

document.querySelector("#year").textContent = new Date().getFullYear();

function updateProgramBar() {
  const now = new Date();
  const hourFormatter = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
  const fullFormatter = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const jakartaHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(now)
  );

  let greeting = "Selamat Malam";
  if (jakartaHour >= 4 && jakartaHour < 11) greeting = "Selamat Pagi";
  else if (jakartaHour >= 11 && jakartaHour < 15) greeting = "Selamat Siang";
  else if (jakartaHour >= 15 && jakartaHour < 18) greeting = "Selamat Sore";

  greetingLabel.textContent = `${greeting}, Depoizon`;
  timeLabel.textContent = `${hourFormatter.format(now)} WIB`;
  dateLabel.textContent = fullFormatter.format(now);
}

updateProgramBar();
window.setInterval(updateProgramBar, 60000);

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  body.classList.toggle("menu-open", isOpen);
});

navAnchors.forEach((anchor) => {
  anchor.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    body.classList.remove("menu-open");
  });
});

function smoothScrollTo(targetY, duration = 1200) {
  if (prefersReducedMotion) {
    window.scrollTo(0, targetY);
    return;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;
  const maxY = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
  const finalY = clamp(targetY, 0, maxY);
  const startTime = performance.now();

  cancelAnimationFrame(smoothScrollFrame);

  function easeInOutCubic(value) {
    return value < 0.5
      ? 4 * value * value * value
      : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easeInOutCubic(progress);
    window.scrollTo(0, startY + (finalY - startY) * eased);

    if (progress < 1) {
      smoothScrollFrame = requestAnimationFrame(step);
    }
  }

  smoothScrollFrame = requestAnimationFrame(step);
}

internalAnchors.forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const href = anchor.getAttribute("href");
    if (!href || href === "#" || href.length < 2) return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    const navbarHeight = document.querySelector(".navbar")?.offsetHeight || 68;
    const topOffset = Math.max(navbarHeight + 26, 92);
    const targetY = target.getBoundingClientRect().top + window.scrollY - topOffset;

    smoothScrollTo(targetY, 1180);
    window.history.replaceState(null, "", href);
  });
});

function triggerRevealEffects(item) {
  if (item.classList.contains("skill-card") && !item.dataset.progressDone) {
    const level = item.dataset.level || 0;
    item.querySelector(".progress span").style.width = `${level}%`;
    item.dataset.progressDone = "true";
  }

  if (item.classList.contains("stat-card") && !item.dataset.counterDone) {
    const counter = item.querySelector(".counter");
    animateCounter(counter);
    item.dataset.counterDone = "true";
  }
}

function updateRevealStates() {
  const viewportHeight = window.innerHeight;
  const enterStart = viewportHeight * 0.9;
  const enterEnd = viewportHeight * 0.1;
  let visibleOrder = 0;

  revealItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const wasVisible = item.classList.contains("visible");
    const visibleTopThreshold = wasVisible ? viewportHeight * 0.97 : enterStart;
    const visibleBottomThreshold = wasVisible ? viewportHeight * 0.03 : enterEnd;
    const isVisible = rect.top < visibleTopThreshold && rect.bottom > visibleBottomThreshold;

    item.classList.remove("exit-up", "exit-down");

    if (isVisible) {
      item.classList.toggle("enter-from-top", scrollDirection === "up");
      item.classList.add("visible");
      item.style.setProperty("--reveal-delay", `${Math.min(visibleOrder * 18, 96)}ms`);
      visibleOrder += 1;
      triggerRevealEffects(item);
      return;
    }

    item.classList.remove("visible");
    item.classList.remove("enter-from-top");

    if (rect.top >= viewportHeight) {
      if (scrollDirection === "up") {
        item.classList.add("exit-up");
      }
      return;
    }

    if (rect.bottom <= 0) {
      item.classList.add(scrollDirection === "up" ? "exit-down" : "exit-up");
    }
  });
}

updateRevealStates();

function animateCounter(counter) {
  if (!counter || counter.dataset.done) return;
  counter.dataset.done = "true";
  const target = Number(counter.dataset.target);
  const duration = 1500;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const value = Math.round(target * eased);
    counter.textContent = target === 100 ? `${value}%` : value;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

const typingEl = document.querySelector(".typing-text");
const typingWords = JSON.parse(typingEl.dataset.typing);
let typingIndex = 0;
let charIndex = 0;
let deleting = false;

function typeLoop() {
  const word = typingWords[typingIndex];
  const visible = word.slice(0, charIndex);
  typingEl.firstChild.nodeValue = visible;

  if (!deleting && charIndex < word.length) {
    charIndex += 1;
    setTimeout(typeLoop, 64);
    return;
  }

  if (!deleting && charIndex === word.length) {
    deleting = true;
    setTimeout(typeLoop, 1300);
    return;
  }

  if (deleting && charIndex > 0) {
    charIndex -= 1;
    setTimeout(typeLoop, 34);
    return;
  }

  deleting = false;
  typingIndex = (typingIndex + 1) % typingWords.length;
  setTimeout(typeLoop, 260);
}

if (!prefersReducedMotion) {
  typeLoop();
}

let pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
};

window.addEventListener("pointermove", (event) => {
  latestPointerEvent = event;

  if (pointerFrame) return;
  pointerFrame = window.requestAnimationFrame(() => {
    if (!latestPointerEvent) {
      pointerFrame = 0;
      return;
    }

    pointer.x = latestPointerEvent.clientX;
    pointer.y = latestPointerEvent.clientY;

    if (!liteMode) {
      updateCursor(latestPointerEvent.clientX, latestPointerEvent.clientY);
    }

    updateRobotLook(latestPointerEvent.clientX, latestPointerEvent.clientY);
    pointerFrame = 0;
  });
}, { passive: true });

window.addEventListener("touchmove", (event) => {
  const touch = event.touches[0];
  if (!touch) return;
  pointer.x = touch.clientX;
  pointer.y = touch.clientY;
  updateRobotLook(touch.clientX, touch.clientY);
}, { passive: true });

function updateCursor(x, y) {
  if (window.innerWidth <= 760 || liteMode) return;
  cursorDot.style.opacity = "1";
  cursorRing.style.opacity = "1";
  cursorDot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  cursorRing.animate(
    { transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` },
    { duration: 420, fill: "forwards", easing: "cubic-bezier(.19,1,.22,1)" }
  );
}

document.querySelectorAll("a, button, input, textarea, .tilt-card, .core").forEach((item) => {
  item.addEventListener("pointerenter", () => cursorRing.classList.add("active"));
  item.addEventListener("pointerleave", () => cursorRing.classList.remove("active"));
});

function updateRobotLook(x, y) {
  if (!robotStage) return;
  const rect = robotStage.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = (x - centerX) / rect.width;
  const dy = (y - centerY) / rect.height;
  const eyeX = clamp(dx * 18, -14, 14);
  const eyeY = clamp(dy * 18, -12, 12);

  pupils.forEach((pupil) => {
    pupil.style.setProperty("--eye-x", `${eyeX}px`);
    pupil.style.setProperty("--eye-y", `${eyeY}px`);
  });

  robot.style.setProperty("--look-x", `${clamp(dx * 16, -9, 9)}px`);
  robot.style.setProperty("--look-y", `${clamp(dy * 16, -8, 8)}px`);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

let coreTapCount = 0;
let coreTapTimer = 0;

function getRobotStatusText() {
  return body.classList.contains("robot-angry")
    ? "Angry Mode Activated"
    : "Digital Assistant Online";
}

function clearLaserCycle() {
  window.clearInterval(laserInterval);
  window.clearTimeout(laserKickoffTimeout);
  window.clearTimeout(laserCleanupTimeout);
  laserInterval = 0;
  laserKickoffTimeout = 0;
  laserCleanupTimeout = 0;
  robotLaserBeam?.classList.remove("active");
  robotLaserImpact?.classList.remove("active");
}

function fireRobotLaser() {
  if (!body.classList.contains("robot-angry") || !robotStage || !robotLaserBeam || !robotLaserImpact) return;

  const face = robot.querySelector(".robot-face");
  if (!face) return;

  const stageRect = robotStage.getBoundingClientRect();
  const faceRect = face.getBoundingClientRect();
  const sourceX = faceRect.left - stageRect.left + faceRect.width / 2;
  const sourceY = faceRect.top - stageRect.top + faceRect.height * 0.58;
  const targetX = clamp(pointer.x - stageRect.left, 22, stageRect.width - 22);
  const targetY = clamp(pointer.y - stageRect.top, 22, stageRect.height - 22);
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.max(Math.hypot(dx, dy), 12);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  robotLaserBeam.style.left = `${sourceX}px`;
  robotLaserBeam.style.top = `${sourceY}px`;
  robotLaserBeam.style.width = `${distance}px`;
  robotLaserBeam.style.transform = `translateY(-50%) rotate(${angle}deg)`;

  robotLaserImpact.style.left = `${targetX}px`;
  robotLaserImpact.style.top = `${targetY}px`;

  robotLaserBeam.classList.remove("active");
  robotLaserImpact.classList.remove("active");
  void robotLaserBeam.offsetWidth;
  robotLaserBeam.classList.add("active");
  robotLaserImpact.classList.add("active");

  window.clearTimeout(laserCleanupTimeout);
  laserCleanupTimeout = window.setTimeout(() => {
    robotLaserBeam.classList.remove("active");
    robotLaserImpact.classList.remove("active");
  }, 820);
}

function syncAngryLaserMode(isAngry) {
  clearLaserCycle();
  if (!isAngry) return;

  laserKickoffTimeout = window.setTimeout(() => {
    fireRobotLaser();
    laserInterval = window.setInterval(fireRobotLaser, 5000);
  }, 900);
}

robotCore.addEventListener("click", () => {
  window.clearTimeout(coreTapTimer);
  coreTapCount += 1;

  if (coreTapCount >= 3) {
    const isAngry = body.classList.toggle("robot-angry");
    robotCore.setAttribute("aria-pressed", String(isAngry));
    robotStatusText.textContent = getRobotStatusText();
    robot.classList.add("angry-burst");
    syncAngryLaserMode(isAngry);
    window.setTimeout(() => robot.classList.remove("angry-burst"), 520);
    coreTapCount = 0;
    return;
  }

  const remaining = 3 - coreTapCount;
  robotStatusText.textContent = body.classList.contains("robot-angry")
    ? `${remaining} tap untuk normal`
    : `${remaining} tap untuk mode marah`;
  coreTapTimer = window.setTimeout(() => {
    coreTapCount = 0;
    robotStatusText.textContent = getRobotStatusText();
  }, 1100);
});

document.querySelectorAll(".tilt-card").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (prefersReducedMotion || liteMode || window.innerWidth < 760) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    const rotateX = -((y / rect.height) - 0.5) * 8;
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

document.querySelectorAll(".magnetic").forEach((button) => {
  button.addEventListener("pointermove", (event) => {
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    button.style.setProperty("--x", `${x}px`);
    button.style.setProperty("--y", `${y}px`);

    if (prefersReducedMotion || liteMode || window.innerWidth < 760) return;
    const moveX = (x - rect.width / 2) * 0.08;
    const moveY = (y - rect.height / 2) * 0.08;
    button.style.transform = `translate(${moveX}px, ${moveY - 3}px)`;
  });

  button.addEventListener("pointerleave", () => {
    button.style.transform = "";
  });
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("section-active", entry.isIntersecting);
      if (!entry.isIntersecting) return;
      navAnchors.forEach((anchor) => {
        anchor.classList.toggle("active", anchor.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { threshold: 0.38, rootMargin: "-10% 0px -16% 0px" }
);

sections.forEach((section) => sectionObserver.observe(section));

window.addEventListener("scroll", () => {
  const y = window.scrollY;
  const delta = y - lastScrollY;
  if (Math.abs(delta) > 2) {
    scrollDirection = delta > 0 ? "down" : "up";
  }
  lastScrollY = y;
  backToTop.classList.toggle("visible", y > 700);
  root.style.setProperty("--scroll", y);

  if (!ticking) {
    window.requestAnimationFrame(() => {
      updateRevealStates();
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

backToTop.addEventListener("click", () => {
  smoothScrollTo(0, 1100);
});

document.querySelector("#contactForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const status = event.currentTarget.querySelector(".form-status");
  status.textContent = "Pesan siap dikirim. Sambungkan form ini ke email atau backend favorit Anda.";
  event.currentTarget.reset();
});

document.querySelectorAll(".copy-email").forEach((button) => {
  button.addEventListener("click", async () => {
    const email = button.dataset.copy;
    const status = document.querySelector(".copy-status");

    try {
      await navigator.clipboard.writeText(email);
      status.textContent = `Email disalin: ${email}`;
    } catch {
      const input = document.createElement("input");
      input.value = email;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      status.textContent = `Email disalin: ${email}`;
    }

    button.classList.add("copied");
    window.setTimeout(() => button.classList.remove("copied"), 900);
  });
});

document.querySelectorAll(".map-photo").forEach((image) => {
  const shell = image.closest(".map-photo-shell");
  if (!shell) return;

  const setReady = () => shell.classList.add("image-ready");
  const setMissing = () => shell.classList.add("image-missing");

  if (image.complete && image.naturalWidth > 0) {
    setReady();
  } else if (image.complete) {
    setMissing();
  } else {
    image.addEventListener("load", setReady, { once: true });
    image.addEventListener("error", setMissing, { once: true });
  }
});

let particles = [];
let canvasWidth = 0;
let canvasHeight = 0;

function resizeCanvas() {
  if (liteMode) {
    canvas.style.display = "none";
    particles = [];
    return;
  }

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = Math.floor(canvasWidth * ratio);
  canvas.height = Math.floor(canvasHeight * ratio);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  createParticles();
}

function createParticles() {
  const count = Math.min(Math.floor((canvasWidth * canvasHeight) / 26000), 48);
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    vx: (Math.random() - 0.5) * 0.26,
    vy: (Math.random() - 0.5) * 0.26,
    radius: Math.random() * 1.5 + 0.7,
    alpha: Math.random() * 0.42 + 0.14,
  }));
}

function drawParticles() {
  if (liteMode) return;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  const angryMode = body.classList.contains("robot-angry");
  const particleColor = angryMode ? "255, 82, 82" : "96, 219, 255";
  const particleGlow = angryMode ? "rgba(255, 48, 48, 0.78)" : "rgba(56, 213, 255, 0.72)";
  const lineColor = angryMode ? "255, 72, 72" : "80, 201, 255";

  particles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;

    const pointerDistance = Math.hypot(pointer.x - particle.x, pointer.y - particle.y);
    if (pointerDistance < 110) {
      particle.x -= (pointer.x - particle.x) * 0.002;
      particle.y -= (pointer.y - particle.y) * 0.002;
    }

    if (particle.x < 0 || particle.x > canvasWidth) particle.vx *= -1;
    if (particle.y < 0 || particle.y > canvasHeight) particle.vy *= -1;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${particleColor}, ${particle.alpha})`;
    ctx.shadowColor = particleGlow;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    for (let next = index + 1; next < particles.length; next += 1) {
      const other = particles[next];
      const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
      if (distance > 96) continue;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(other.x, other.y);
      ctx.strokeStyle = `rgba(${lineColor}, ${0.09 * (1 - distance / 96)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });

  if (!prefersReducedMotion) requestAnimationFrame(drawParticles);
}

resizeCanvas();
drawParticles();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", updateRevealStates);
