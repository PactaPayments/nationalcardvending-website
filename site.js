/* National Card Vending v2 — shared behavior for index.html and partners.html.
   PROOF: fill these with verified numbers only. null renders a visible [placeholder]. */
window.PROOF = window.PROOF || {
  machinesLive: null,   /* e.g. 30  — machines placed and selling today */
  statesLive: null,     /* e.g. 1   — states with live machines */
  hostsLive: null       /* e.g. 19  — host businesses */
};
(function () {
  "use strict";
  var CFG = window.SITE_CONFIG || {};

  /* Meta Pixel 1089398574094680 — loaded after the page so it never slows first paint */
  function pixel() {
    if (window.fbq) return;
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", "1089398574094680");
    fbq("track", "PageView");
  }
  if (document.readyState === "complete") setTimeout(pixel, 1200); else window.addEventListener("load", function () { setTimeout(pixel, 1200); });

  document.addEventListener("DOMContentLoaded", function () {
    /* proof numbers */
    document.querySelectorAll("[data-proof]").forEach(function (el) {
      var v = window.PROOF[el.getAttribute("data-proof")];
      if (v == null) { el.innerHTML = '<span class="ph">[' + (el.getAttribute("data-ph") || "verified #") + "]</span>"; }
      else el.textContent = v.toLocaleString("en-US") + (el.getAttribute("data-suffix") || "");
    });

    /* mobile nav */
    var b = document.querySelector(".burger"), m = document.querySelector(".mnav");
    if (b && m) {
      b.addEventListener("click", function () { var o = m.classList.toggle("open"); b.setAttribute("aria-expanded", o); });
      m.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { m.classList.remove("open"); }); });
    }

    /* year */
    var y = document.querySelector("[data-year]"); if (y) y.textContent = new Date().getFullYear();

    /* Cal.com inline booking, loaded only when it scrolls near (keeps the page fast) */
    var cal = document.querySelector("[data-cal]");
    if (cal && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); loadCal(cal); } }, { rootMargin: "400px" });
      io.observe(cal);
    }

    /* forms -> Formspree xkjwvzop, Lead event on success */
    document.querySelectorAll("[data-inquiry-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
        data._form = form.getAttribute("data-inquiry-form"); data._source = "nationalcardvending.com" + location.pathname;
        var btn = form.querySelector('[type="submit"]'); if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }
        function done() {
          form.classList.add("is-hidden");
          var ok = form.parentNode.querySelector(".ok"); if (ok) { ok.classList.add("on"); ok.setAttribute("role", "status"); }
          try { if (window.fbq) fbq("track", "Lead", { content_name: data._form }); } catch (x) {}
        }
        fetch(CFG.formEndpoint || "https://formspree.io/f/xkjwvzop", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
          .catch(function () {
            location.href = "mailto:" + (CFG.contactEmail || "jacob@nationalcardvending.com") + "?subject=" + encodeURIComponent("Inquiry — " + (data.company || data.business || data.name || "")) + "&body=" + encodeURIComponent(Object.keys(data).filter(function (k) { return k[0] !== "_"; }).map(function (k) { return k + ": " + data[k]; }).join("\n"));
            done();
          });
      });
    });
  });

  function loadCal(el) {
    (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal, ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var ns = ar[1]; api.q = api.q || []; if (typeof ns === "string") { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ["initNamespace", ns]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    Cal("init", "ncv", { origin: "https://app.cal.com" });
    Cal.ns.ncv("inline", { elementOrSelector: "#" + el.id, calLink: "partner-meeting/national-card-vending-placement-meeting", layout: "month_view", config: { theme: "dark" } });
    Cal.ns.ncv("ui", { theme: "dark", hideEventTypeDetails: false, layout: "month_view" });
  }
})();
