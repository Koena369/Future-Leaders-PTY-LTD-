/* Future Leaders — shared behaviour for every page.
   Menu, progress bar, reveals, counters, copy buttons, enquiry form. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* Mobile menu */
  var menuButton = $(".menu-toggle");
  var menu = $("#main-menu");
  var header = $(".site-header");
  function setMenuOpen(isOpen) {
    if (!menu || !menuButton) return;
    menu.classList.toggle("is-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  }
  if (menuButton && menu) {
    menuButton.addEventListener("click", function () {
      setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });
    $$("a", menu).forEach(function (link) {
      link.addEventListener("click", function () { setMenuOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false); menuButton.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (menu.classList.contains("is-open") && header && !header.contains(e.target)) setMenuOpen(false);
    });
    var wide = window.matchMedia("(min-width: 821px)");
    var onWide = function (ev) { if (ev.matches) setMenuOpen(false); };
    if (wide.addEventListener) wide.addEventListener("change", onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* Header state, progress bar, hero parallax */
  var progress = $(".progress");
  var visual = $(".hero-visual");
  var ticking = false;
  function onScrollFrame() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    }
    if (visual) {
      if (!reduceMotion && window.innerWidth > 900 && y < 900) {
        visual.style.transform = "translate3d(0," + (y * 0.06).toFixed(1) + "px,0)";
      } else visual.style.transform = "";
    }
  }
  function requestScrollFrame() { if (!ticking) { ticking = true; window.requestAnimationFrame(onScrollFrame); } }
  window.addEventListener("scroll", requestScrollFrame, { passive: true });
  window.addEventListener("resize", requestScrollFrame);
  onScrollFrame();

  /* Scroll reveals */
  var revealEls = $$("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); revealer.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { revealer.observe(el); });
  }

  /* Counters */
  function runCounter(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }
    var start = null, duration = 1400;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / duration, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  var counters = $$("[data-count]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var counterSpy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); counterSpy.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { counterSpy.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
  }

  /* Pointer glow on hero panel */
  var art = $(".hero-art");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (art && finePointer && !reduceMotion) {
    var glowTick = false;
    art.addEventListener("pointermove", function (e) {
      if (glowTick) return;
      glowTick = true;
      window.requestAnimationFrame(function () {
        glowTick = false;
        var r = art.getBoundingClientRect();
        art.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
        art.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
      });
    });
  }

  /* Toast */
  var toast = $("#toast"), toastText = $("#toast-text"), toastTimer = null;
  function showToast(message) {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.add("show");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 3200);
  }

  /* Copy email */
  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      return;
    }
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta); done(ok);
    } catch (err) { done(false); }
  }
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy");
      copyText(value, function (ok) { showToast(ok ? "Email copied: " + value : "Copy failed — " + value); });
    });
  });

  /* Enquiry form → ready-to-send email */
  var form = $("#enquiry-form");
  var message = $("#f-message"), charCount = $("#char-count");
  if (message && charCount) {
    message.addEventListener("input", function () { charCount.textContent = message.value.length + "/600"; });
  }
  function setError(input, text) {
    var field = input.closest(".field");
    var err = field ? $(".field-error", field) : null;
    if (err) { err.textContent = text || ""; err.classList.toggle("show", !!text); }
    if (text) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
  }
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#f-name"), email = $("#f-email"), org = $("#f-org"),
          interest = $("#f-interest"), msg = $("#f-message");
      var firstBad = null;
      if (!name.value.trim()) { setError(name, "Please add your name."); firstBad = firstBad || name; } else setError(name, "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setError(email, "Please add a valid email address."); firstBad = firstBad || email; } else setError(email, "");
      if (!msg.value.trim()) { setError(msg, "Tell us a little about your goals."); firstBad = firstBad || msg; } else setError(msg, "");
      if (firstBad) { firstBad.focus(); return; }

      var subject = "Enquiry: " + interest.value + " — " + name.value.trim();
      var body = [
        "Name: " + name.value.trim(),
        "Email: " + email.value.trim(),
        "Organisation: " + (org.value.trim() || "—"),
        "Interested in: " + interest.value,
        "", msg.value.trim(), "",
        "— Sent via the Future Leaders website"
      ].join("\n");
      var label = $(".submit-label", form);
      var original = label ? label.textContent : "";
      if (label) label.textContent = "Opening your email app…";
      showToast("Opening your email app — your message is ready to send.");
      window.location.href = "mailto:plentygeorgeous@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      window.setTimeout(function () { if (label) label.textContent = original; }, 2500);
    });
  }
})();