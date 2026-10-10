document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar");
  const btnFale = document.getElementById("btn-fale-conosco");

  if (navbar) {

    let lastScrollY = window.scrollY;
    
    window.addEventListener("scroll", () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        // Rolando para baixo -> ocultar
        navbar.classList.add("-translate-y-full");
      } else {
        // Rolando para cima -> mostrar
        navbar.classList.remove("-translate-y-full");
      }
      
      lastScrollY = Math.max(0, window.scrollY);
    }, { passive: true });
  }

  const observerOptions = { root: null, rootMargin: "0px", threshold: 0.1 };
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        if (entry.target.querySelector(".counter")) {
          startCounters(entry.target);
        }
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  function startCounters(container) {
    const counters = container.querySelectorAll(".counter");
    counters.forEach((counter) => {
      const target = +counter.getAttribute("data-target");
      const duration = 2000;
      const startTime = performance.now();

      function updateCounter(currentTime) {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime < duration) {
          const progress = elapsedTime / duration;
          const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          const currentVal = Math.floor(target * easeProgress);
          counter.innerText = currentVal.toLocaleString("pt-BR");
          requestAnimationFrame(updateCounter);
        } else {
          counter.innerText = target.toLocaleString("pt-BR");
        }
      }
      requestAnimationFrame(updateCounter);
    });
  }

  const faqBtns = document.querySelectorAll(".faq-btn");
  faqBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector("iconify-icon");

      faqBtns.forEach((otherBtn) => {
        if (otherBtn !== btn) {
          otherBtn.nextElementSibling.style.maxHeight = null;
          otherBtn.querySelector("iconify-icon")?.classList.remove("rotate-180");
        }
      });

      if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon?.classList.remove("rotate-180");
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon?.classList.add("rotate-180");
      }
    });
  });

  // Interactive Timeline Images (Desktop) for "Como funciona" tracking
  const stepTriggers = document.querySelectorAll(".step-trigger");
  stepTriggers.forEach((trigger) => {
    trigger.addEventListener("mouseenter", () => {
      const targetId = trigger.getAttribute("data-target");
      // Hide all images
      document.querySelectorAll("#como-funciona img").forEach((img) => {
        img.classList.remove("opacity-100");
        img.classList.add("opacity-0");
      });
      // Show target
      const targetImg = document.getElementById(targetId);
      if (targetImg) {
        targetImg.classList.remove("opacity-0");
        targetImg.classList.add("opacity-100");
      }

      // Reset styling on triggers
      stepTriggers.forEach((t) => {
        const iconBox = t.querySelector("div.w-14");
        const num = t.querySelector("span.font-display");
        iconBox?.classList.remove("border-accent", "bg-accent/5");
        iconBox?.classList.add("border-gray-200", "bg-white");
        num?.classList.remove("text-accent");
        num?.classList.add("text-gray-400");
      });

      // Add active styling
      const iconBox = trigger.querySelector("div.w-14");
      const num = trigger.querySelector("span.font-display");
      iconBox?.classList.remove("border-gray-200", "bg-white");
      iconBox?.classList.add("border-accent", "bg-accent/5");
      num?.classList.remove("text-gray-400");
      num?.classList.add("text-accent");
    });
  });

  // Slider Drag Logic for Projetos Realizados
  function initFeaturedDrag() {
      function setupTrack(shell, track, speed = 0.5) {
          if (!shell || !track) return;
          if (track.dataset.dragReady === 'true') return;

          track.dataset.dragReady = 'true';
          track.classList.add('js-track-controlled');

          let isDown = false;
          let startX = 0;
          let currentTranslate = null; 
          let previousTranslate = 0;
          let animationFrame = null;
          let autoScroll = true;
          let velocity = 0;
          let lastX = 0;
          let lastTime = 0;
          let momentumFrame = null;
          let hasDragged = false;
          const direction = track.classList.contains('reverse') ? 1 : -1;

          function getLoopWidth() {
              return track.scrollWidth / 2;
          }

          function initTranslateIfNeeded() {
              if (currentTranslate === null && track.scrollWidth > 0) {
                  currentTranslate = track.classList.contains('reverse') ? -(track.scrollWidth / 2) : 0;
                  previousTranslate = currentTranslate;
              }
          }

          function normalizeLoop() {
              const loopWidth = getLoopWidth();
              if (!loopWidth) return;

              if (currentTranslate < -loopWidth) currentTranslate += loopWidth;
              if (currentTranslate > 0) currentTranslate -= loopWidth;
              previousTranslate = currentTranslate;
          }

          function setTrackPosition() {
              if (currentTranslate !== null) {
                  track.style.transform = `translate3d(${currentTranslate}px, 0, 0)`;
              }
          }

          function stopMomentum() {
              if (momentumFrame) {
                  cancelAnimationFrame(momentumFrame);
                  momentumFrame = null;
              }
          }

          function autoMove() {
              initTranslateIfNeeded();
              if (currentTranslate !== null && autoScroll && !isDown) {
                  currentTranslate += speed * direction;
                  normalizeLoop();
                  setTrackPosition();
              }
              animationFrame = requestAnimationFrame(autoMove);
          }

          function startMomentum() {
              stopMomentum();
              function step() {
                  if (Math.abs(velocity) < 0.08) {
                      velocity = 0;
                      previousTranslate = currentTranslate;
                      setTimeout(() => { autoScroll = true; }, 500);
                      return;
                  }

                  currentTranslate += velocity;
                  velocity *= 0.97;
                  normalizeLoop();
                  setTrackPosition();
                  momentumFrame = requestAnimationFrame(step);
              }

              momentumFrame = requestAnimationFrame(step);
          }

          function dragStart(x) {
              initTranslateIfNeeded();
              if (currentTranslate === null) return;

              isDown = true;
              autoScroll = false;
              hasDragged = false; 
              startX = x;
              lastX = x;
              lastTime = performance.now();
              velocity = 0;
              stopMomentum();
              shell.classList.add('cursor-grabbing');
          }

          function dragMove(x) {
              if (!isDown || currentTranslate === null) return;

              const now = performance.now();
              const delta = x - startX;
              const frameDelta = x - lastX;
              const dt = Math.max(now - lastTime, 1);

              if (Math.abs(delta) > 5) hasDragged = true;

              velocity = (frameDelta / dt) * 0.35;
              currentTranslate = previousTranslate + (delta * 0.08);
              normalizeLoop();
              setTrackPosition();

              lastX = x;
              lastTime = now;
          }

          function dragEnd() {
              if (!isDown) return;
              isDown = false;
              previousTranslate = currentTranslate;
              shell.classList.remove('cursor-grabbing');
              startMomentum();
          }

          shell.addEventListener('click', (e) => {
              if (hasDragged) {
                  e.preventDefault();
                  e.stopPropagation();
              }
          }, { capture: true });

          shell.addEventListener('mousedown', (e) => dragStart(e.pageX));
          window.addEventListener('mousemove', (e) => dragMove(e.pageX));
          window.addEventListener('mouseup', dragEnd);
          shell.addEventListener('mouseleave', dragEnd);

          shell.addEventListener('touchstart', (e) => dragStart(e.touches[0].clientX), { passive: true });
          shell.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX), { passive: true });
          shell.addEventListener('touchend', dragEnd, { passive: true });

          if (animationFrame) cancelAnimationFrame(animationFrame);
          autoMove();
      }

      document.querySelectorAll('.marquee-shell').forEach((shell) => {
          const track = shell.querySelector('.video-marquee');
          setupTrack(shell, track, 0.45);
      });
  }

  // Initialize sliders
  setTimeout(initFeaturedDrag, 300);
});

// Global functions for Modal and Tabs
window.openVideoModal = function(videoPath) {
    // Segurança: rejeitar URLs externas ou protocolos suspeitos
    if (!videoPath || typeof videoPath !== 'string') return;
    if (/^(https?|\/\/|javascript|data|blob):/i.test(videoPath)) {
        console.warn('[Girassol] Blocked external video path:', videoPath);
        return;
    }
    // Garantir que o path comece com ARQUIVOS/VIDEOS/
    if (!videoPath.startsWith('ARQUIVOS/VIDEOS/')) {
        console.warn('[Girassol] Blocked unauthorized video path:', videoPath);
        return;
    }
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoContainer');

    const video = document.createElement('video');
    video.setAttribute('src', videoPath);
    video.setAttribute('controls', 'true');
    video.setAttribute('controlsList', 'nodownload');
    video.setAttribute('autoplay', 'true');
    video.setAttribute('playsinline', 'true');
    video.oncontextmenu = () => false;
    video.className = 'w-full h-full absolute inset-0 object-contain bg-black';

    container.innerHTML = '';
    container.appendChild(video);

    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        container.classList.remove('scale-95');
        container.classList.add('scale-100');
    }, 50);

    document.body.style.overflow = 'hidden';
};

window.closeVideoModal = function() {
    const modal = document.getElementById('videoModal');
    const container = document.getElementById('videoContainer');

    container.classList.remove('scale-100');
    container.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('opacity-0', 'pointer-events-none');
        container.innerHTML = '';
        document.body.style.overflow = '';
    }, 300);
};

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") window.closeVideoModal();
});

window.switchTab = function(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
        tab.classList.remove('flex');
    });
    
    // Show target tab
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('flex');
    }

    // Update active visual state for buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-brand-dark', 'after:bg-brand-dark');
        btn.classList.add('text-gray-400', 'after:bg-transparent');
    });

    const activeBtnId = tabId.replace('tab-', 'btn-tab-');
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-400', 'after:bg-transparent');
        activeBtn.classList.add('text-brand-dark', 'after:bg-brand-dark');
    }
};

