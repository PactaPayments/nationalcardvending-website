/* National Card Vending — single-page site behavior
   Integrations are configured in window.SITE_CONFIG (set in index.html):
     bookingUrl   — cal.com / Calendly link for the booking button
     formEndpoint — Formspree/GoHighLevel endpoint; "" = email fallback
     contactEmail — fallback inbox for form submissions */
(function () {
  "use strict";

  var CFG = window.SITE_CONFIG || {};
  var FORM_ENDPOINT = CFG.formEndpoint || "";
  var CONTACT_EMAIL = CFG.contactEmail || "jacob@nationalcardvending.com";

  document.addEventListener("DOMContentLoaded", function () {
    initBookingLinks();
    initNav();
    initBackToTop();
    initReveal();
    initForms();
    initYear();
  });

  /* ---------- Booking links pick up SITE_CONFIG.bookingUrl ---------- */
  function initBookingLinks() {
    if (!CFG.bookingUrl) return;
    document.querySelectorAll("[data-booking-link]").forEach(function (a) {
      a.href = CFG.bookingUrl;
    });
  }

  /* ---------- Nav: scroll condense + mobile menu ---------- */
  function initNav() {
    var nav = document.querySelector(".nav");
    var toggle = document.querySelector(".nav__toggle");
    var mobile = document.querySelector(".nav__mobile");
    if (!nav) return;

    var ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          nav.classList.toggle("is-scrolled", window.scrollY > 24);
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toggle && mobile) {
      function openMenu() {
        mobile.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
        var firstLink = mobile.querySelector("a");
        if (firstLink) firstLink.focus();
      }
      function closeMenu(returnFocus) {
        mobile.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
        if (returnFocus) toggle.focus();
      }
      toggle.addEventListener("click", function () {
        if (mobile.classList.contains("is-open")) closeMenu(false);
        else openMenu();
      });
      mobile.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { closeMenu(false); });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && mobile.classList.contains("is-open")) closeMenu(true);
      });
    }
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    var btn = document.querySelector(".back-to-top");
    if (!btn) return;
    window.addEventListener(
      "scroll",
      function () { btn.classList.toggle("is-visible", window.scrollY > 700); },
      { passive: true }
    );
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -36px 0px" }
    );
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Forms ---------- */
  function initForms() {
    document.querySelectorAll("[data-inquiry-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        handleSubmit(form);
      });
    });
  }

  function handleSubmit(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) { data[key] = value; });
    data._form = form.getAttribute("data-inquiry-form") || "general";
    data._source = "nationalcardvending.com";

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending..."; }

    function showSuccess() {
      var wrap = form.closest(".form-panel");
      var success = wrap ? wrap.querySelector(".form-success") : null;
      form.classList.add("is-hidden");
      var heading = wrap ? wrap.querySelector("h3") : null;
      if (heading && heading !== null && !form.contains(heading)) heading.style.display = "none";
      if (success) {
        success.classList.add("is-visible");
        success.setAttribute("aria-live", "polite");
        success.setAttribute("role", "status");
        success.setAttribute("tabindex", "-1");
        success.focus();
      }
    }

    if (FORM_ENDPOINT) {
      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function () { showSuccess(); })
        .catch(function () { fallbackToEmail(data); showSuccess(); });
    } else {
      fallbackToEmail(data);
      showSuccess();
    }
  }

  function fallbackToEmail(data) {
    var subject = encodeURIComponent("Host inquiry — " + (data.business || data.name || "New submission"));
    var lines = [];
    Object.keys(data).forEach(function (key) {
      if (key.indexOf("_") === 0) return;
      lines.push(key + ": " + data[key]);
    });
    var body = encodeURIComponent(lines.join("\n"));
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + subject + "&body=" + body;
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    var el = document.querySelector("[data-year]");
    if (el) el.textContent = new Date().getFullYear();
  }
})();
