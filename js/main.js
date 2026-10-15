/* ==========================================================
   SEMELC — interações e animações da página
   GSAP 3.13 (ScrollTrigger + SplitText) + Lenis — gratuitos
   ========================================================== */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const cfg = window.SEMELC || {};

  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------- CTAs → WhatsApp (ou âncora do CTA final) ---------- */
  const digits = String(cfg.whatsapp || "").replace(/\D/g, "");
  function wireCta(a) {
    const msg = a.dataset.msg || "Olá! Vim pelo site da Semelc.";
    if (digits) {
      a.href = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
      a.target = "_blank";
      a.rel = "noopener";
    }
  }
  $$(".js-cta").forEach(wireCta);

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ---------- Âncoras (inclui painéis do scroll horizontal) ---------- */
  let solST = null;
  function scrollToTarget(el) {
    const panels = $$(".panel");
    const i = panels.indexOf(el);
    let y;
    if (i >= 0 && solST) {
      y = solST.start + (solST.end - solST.start) * (i / (panels.length - 1)) + 2;
    } else {
      y = el.getBoundingClientRect().top + window.scrollY - 90;
    }
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(el);
  });

  /* ---------- Menu mobile ---------- */
  const burger = $(".burger");
  const menu = $("#mobileMenu");
  function closeMenu() {
    menu.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
  }
  burger.addEventListener("click", () => {
    const open = !menu.classList.contains("is-open");
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
  });

  /* ---------- Header some ao rolar para baixo ---------- */
  const header = $("#header");
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      const y = self.scroll();
      header.classList.toggle("is-hidden", y > 300 && y > lastY && !menu.classList.contains("is-open"));
      lastY = y;
    },
  });

  /* ---------- Relógios ---------- */
  const clocks = $$(".js-clock");
  const tick = () => {
    const d = new Date();
    const t = d.toLocaleTimeString("pt-BR", { hour12: false });
    clocks.forEach((c) => (c.textContent = t));
  };
  tick();
  setInterval(tick, 1000);
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Cursor mira ---------- */
  if (finePointer && !reduced) {
    document.body.classList.add("has-cursor");
    const cur = $(".cursor");
    const dot = $(".cursor__dot");
    const ring = $(".cursor__ring");
    const label = $(".cursor__label");
    const dx = gsap.quickTo(dot, "x", { duration: 0.08 }), dy = gsap.quickTo(dot, "y", { duration: 0.08 });
    const rx = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });
    window.addEventListener("pointermove", (e) => { cur.classList.add("is-on"); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.documentElement.addEventListener("pointerleave", () => cur.classList.remove("is-on"));
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t) { label.textContent = t.dataset.cursor; cur.classList.add("is-hover"); }
    });
    document.addEventListener("pointerout", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (t && !t.contains(e.relatedTarget)) cur.classList.remove("is-hover");
    });
    document.addEventListener("pointerdown", () => gsap.to(ring, { scale: 0.8, duration: 0.15, yoyo: true, repeat: 1 }));
  }

  /* ---------- Botões magnéticos ---------- */
  if (finePointer && !reduced) {
    $$(".magnetic").forEach((b) => {
      const xTo = gsap.quickTo(b, "x", { duration: 0.6, ease: "elastic.out(1,.4)" });
      const yTo = gsap.quickTo(b, "y", { duration: 0.6, ease: "elastic.out(1,.4)" });
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Canvas: radar (hero e CTA final) ---------- */
  function radar(canvas, opts) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, dpr, visible = true, mx = 0, my = 0;
    const blips = [];
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
    window.addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
    const c = opts.color;
    function frame(t) {
      requestAnimationFrame(frame);
      if (!visible) return;
      const s = t / 1000;
      ctx.clearRect(0, 0, w, h);
      const cx = w * opts.x + mx * 30, cy = h * opts.y + my * 30;
      const R = Math.max(w, h) * opts.r;
      // anéis fixos
      ctx.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        ctx.strokeStyle = `rgba(${c},${opts.ring * (1 - i / 7)})`;
        ctx.beginPath(); ctx.arc(cx, cy, (R / 5) * i, 0, Math.PI * 2); ctx.stroke();
      }
      // ondas expandindo
      for (let i = 0; i < 3; i++) {
        const p = ((s * 0.18 + i / 3) % 1);
        ctx.strokeStyle = `rgba(${c},${(1 - p) * opts.wave})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, p * R, 0, Math.PI * 2); ctx.stroke();
      }
      // varredura
      if (!reduced) {
        const a = s * 0.9;
        const g = ctx.createConicGradient ? ctx.createConicGradient(a - 0.9, cx, cy) : null;
        if (g) {
          g.addColorStop(0, `rgba(${c},0)`);
          g.addColorStop(0.14, `rgba(${c},${opts.sweep})`);
          g.addColorStop(0.1401, `rgba(${c},0)`);
          g.addColorStop(1, `rgba(${c},0)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
        }
        if (Math.random() < 0.02 && blips.length < 6) {
          const ang = a + Math.random() * 0.3, rr = R * (0.2 + Math.random() * 0.75);
          blips.push({ x: cx + Math.cos(ang) * rr - mx * 30, y: cy + Math.sin(ang) * rr - my * 30, life: 1 });
        }
        for (const b of blips) {
          b.life -= 0.008;
          ctx.fillStyle = `rgba(${c},${b.life * opts.blip})`;
          ctx.beginPath(); ctx.arc(b.x + mx * 30, b.y + my * 30, 3, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = `rgba(${c},${b.life * opts.blip * 0.5})`;
          ctx.beginPath(); ctx.arc(b.x + mx * 30, b.y + my * 30, 3 + (1 - b.life) * 18, 0, Math.PI * 2); ctx.stroke();
        }
        for (let i = blips.length - 1; i >= 0; i--) if (blips[i].life <= 0) blips.splice(i, 1);
      }
    }
    requestAnimationFrame(frame);
  }
  const mobile = window.innerWidth < 900;
  radar($("#heroRadar"), { color: "227,18,11", x: mobile ? 0.9 : 0.8, y: mobile ? 0.18 : 0.32, r: mobile ? 0.9 : 0.42, ring: 0.18, wave: 0.28, sweep: 0.10, blip: 0.8 });
  radar($("#ctaRadar"), { color: "255,42,26", x: 0.5, y: 0.5, r: 0.55, ring: 0.22, wave: 0.35, sweep: 0.16, blip: 1 });

  /* ---------- Canvas do visor do hero: linha de varredura + grade ---------- */
  (function heroFx() {
    const cv = $("#heroFx");
    if (!cv || reduced) return;
    const ctx = cv.getContext("2d");
    let w, h;
    const size = () => { w = cv.width = cv.clientWidth; h = cv.height = cv.clientHeight; };
    size();
    new ResizeObserver(size).observe(cv);
    function f(t) {
      requestAnimationFrame(f);
      ctx.clearRect(0, 0, w, h);
      const y = ((t / 4000) % 1) * h;
      const g = ctx.createLinearGradient(0, y - 80, 0, y);
      g.addColorStop(0, "rgba(255,42,26,0)");
      g.addColorStop(1, "rgba(255,42,26,.22)");
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 80, w, 80);
      ctx.fillStyle = "rgba(255,80,60,.7)";
      ctx.fillRect(0, y, w, 1);
    }
    requestAnimationFrame(f);
  })();

  /* ---------- Contadores ---------- */
  function countUp(el) {
    const to = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const suf = el.dataset.suffix || "";
    const o = { v: 0 };
    gsap.to(o, {
      v: to, duration: 2, ease: "power3.out",
      onUpdate: () => (el.textContent = o.v.toFixed(dec).replace(".", ",") + suf),
    });
  }

  /* ==========================================================
     ANIMAÇÕES DE ENTRADA E SCROLL
     ========================================================== */
  function buildScroll() {
    // Títulos com SplitText (máscara por linha)
    $$(".split").forEach((el) => {
      SplitText.create(el, {
        type: "lines,words", mask: "lines", linesClass: "line", autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        }),
      });
    });

    // Fade-up genérico
    $$(".reveal").forEach((el) => {
      gsap.from(el, {
        y: 40, autoAlpha: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    // Contadores
    $$("[data-count]").forEach((el) => {
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => countUp(el) });
    });

    // Hero: visor expande para tela cheia
    const vf = $("#viewfinder");
    const vfImg = $(".viewfinder__img");
    const gutter = () => Math.round(Math.min(48, Math.max(16, window.innerWidth * 0.04)));
    gsap.timeline({
      scrollTrigger: { trigger: ".viewfinder-wrap", start: "top 80%", end: "bottom 60%", scrub: 1, invalidateOnRefresh: true },
    })
      .fromTo(vf, { clipPath: () => `inset(0px ${gutter()}px 0px ${gutter()}px round 28px)` },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", ease: "none" }, 0)
      .fromTo(vfImg, { scale: 1.2, yPercent: -4 }, { scale: 1, yPercent: 4, ease: "none" }, 0);

    // Marquee com velocidade reagindo ao scroll
    const track = $(".marquee__track");
    const loop = gsap.to(track, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
    let dir = 1;
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => {
        dir = self.direction;
        const v = Math.min(Math.abs(self.getVelocity()) / 400, 6);
        gsap.to(loop, { timeScale: dir * (1 + v), duration: 0.3, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1, delay: 0.3 });
      },
    });

    // Cards de necessidade: entrada + tilt 3D + brilho
    gsap.from(".need-card", {
      y: 120, rotateX: -18, autoAlpha: 0, duration: 1.3, ease: "expo.out", stagger: 0.12,
      scrollTrigger: { trigger: ".need__grid", start: "top 85%", once: true },
    });
    if (finePointer) {
      $$(".tilt").forEach((card) => {
        const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
        const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
        card.addEventListener("pointermove", (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          ry((px - 0.5) * 12); rx((0.5 - py) * 10);
          card.style.setProperty("--mx", `${px * 100}%`);
          card.style.setProperty("--my", `${py * 100}%`);
        });
        card.addEventListener("pointerleave", () => { rx(0); ry(0); });
      });
    }

    // Frase de impacto: palavras acendem com o scroll
    const st = SplitText.create("#statement", { type: "words", wordsClass: "word" });
    gsap.to(st.words, {
      color: "var(--text)", stagger: 0.1, ease: "none",
      scrollTrigger: { trigger: "#statement", start: "top 80%", end: "bottom 45%", scrub: true },
    });
    gsap.fromTo(".reality", { x: 60 }, {
      x: 0, ease: "power3.out", duration: 1, stagger: 0.12,
      scrollTrigger: { trigger: ".realities", start: "top 80%", once: true },
    });

    // Soluções: scroll horizontal no desktop
    const mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", () => {
      const tr = $("#solTrack");
      const dist = () => tr.scrollWidth - window.innerWidth;
      const tween = gsap.to(tr, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: "#solPin", start: "top top", end: () => `+=${dist()}`,
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (s) => gsap.set("#solProgress", { scaleX: s.progress }),
        },
      });
      solST = tween.scrollTrigger;
      $$(".panel").forEach((p) => {
        gsap.fromTo($("img", p), { xPercent: -8 }, {
          xPercent: 8, ease: "none",
          scrollTrigger: { trigger: p, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
        });
        gsap.from($$(".panel__body > *", p), {
          y: 50, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: p, containerAnimation: tween, start: "left 60%", once: true },
        });
      });
      return () => { solST = null; };
    });
    mm.add("(max-width: 900px)", () => {
      $$(".panel").forEach((p) => {
        gsap.from($$(".panel__body > *", p), {
          y: 40, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: p, start: "top 75%", once: true },
        });
      });
    });

    // Linha do tempo: ano rolando + linha preenchendo
    const yearEl = $("#yearCounter");
    const yr = { v: 1990 };
    gsap.to(yr, {
      v: 2026, ease: "none",
      onUpdate: () => (yearEl.textContent = Math.round(yr.v)),
      scrollTrigger: { trigger: "#timeline", start: "top 60%", end: "bottom 60%", scrub: 0.6 },
    });
    gsap.to("#timelineFill", {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: "#timeline", start: "top 60%", end: "bottom 60%", scrub: true },
    });
    $$(".tl-item").forEach((it) => {
      ScrollTrigger.create({
        trigger: it, start: "top 62%",
        onToggle: (s) => it.classList.toggle("is-active", s.isActive || s.progress > 0),
        end: "max",
      });
      gsap.from($(".tl-item__card", it), {
        x: 60, autoAlpha: 0, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: it, start: "top 80%", once: true },
      });
    });

    // Console: entrada
    gsap.from("#console", {
      y: 80, scale: 0.96, autoAlpha: 0, duration: 1.2, ease: "expo.out",
      scrollTrigger: { trigger: "#console", start: "top 85%", once: true },
    });

    // Prova social: anel 92% e barras 9,2/10
    const ring = $("#ring92");
    if (ring) {
      const C = 2 * Math.PI * 52;
      gsap.to(ring, {
        strokeDashoffset: C * (1 - 0.92), duration: 2, ease: "power3.out",
        scrollTrigger: { trigger: ring, start: "top 85%", once: true },
      });
    }
    $$("#bars92 i").forEach((b, i) => {
      gsap.to(b, {
        "--fill": Math.max(0, Math.min(1, 9.2 - i)), duration: 0.8, delay: i * 0.08, ease: "power2.out",
        scrollTrigger: { trigger: "#bars92", start: "top 85%", once: true },
      });
    });

    // CTA final: título com leve parallax
    gsap.from(".cta-final__inner", {
      y: 60, ease: "none",
      scrollTrigger: { trigger: ".cta-final", start: "top bottom", end: "center center", scrub: true },
    });
  }

  /* ---------- FAQ com altura animada ---------- */
  $$(".faq__item").forEach((d) => {
    const sum = $("summary", d);
    const body = $(".faq__a", d);
    sum.addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, duration: 0.45, ease: "power3.inOut", onComplete: () => { d.open = false; gsap.set(body, { clearProps: "height" }); } });
      } else {
        d.open = true;
        gsap.fromTo(body, { height: 0 }, { height: "auto", duration: 0.55, ease: "power3.out", onComplete: () => ScrollTrigger.refresh() });
      }
    });
  });

  /* ---------- CTA final: escolha do patrimônio ---------- */
  const finalCta = $("#finalCta");
  $$(".pick").forEach((p) => {
    p.addEventListener("click", () => {
      $$(".pick").forEach((x) => x.classList.toggle("is-active", x === p));
      finalCta.dataset.msg = p.dataset.pick;
      wireCta(finalCta);
      gsap.fromTo(finalCta, { scale: 0.94 }, { scale: 1, duration: 0.6, ease: "elastic.out(1,.4)" });
    });
  });

  /* ==========================================================
     PRELOADER — boot do sistema + abertura do obturador
     ========================================================== */
  function heroIntro() {
    const title = $("#heroTitle");
    const split = SplitText.create(title, { type: "words,lines", mask: "lines", linesClass: "line" });
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(split.words, { yPercent: 120, rotate: 4, duration: 1.3, stagger: 0.05 })
      .fromTo(".hero__title .hl", { "--hl": 0 }, { "--hl": 1, duration: 0.9, ease: "power4.inOut" }, "-=0.9")
      .from(".hero-anim", { y: 30, autoAlpha: 0, duration: 1, stagger: 0.1 }, "-=1")
      .from(".viewfinder", { y: 120, autoAlpha: 0, duration: 1.4 }, "-=1")
      .from(".hud__c", { scale: 0, duration: 0.6, stagger: 0.05, ease: "back.out(3)" }, "-=0.8")
      .from(".hero__stats > div", { y: 30, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, "-=1");
    return tl;
  }

  function start() {
    document.body.classList.remove("is-loading");
    if (lenis) lenis.start();
    buildScroll();
    if (window.Central) window.Central.init();
    ScrollTrigger.refresh();
  }

  const loader = $("#loader");
  if (reduced) {
    loader.remove();
    start();
    return;
  }

  // traços do anel
  const ticks = $(".ring-ticks");
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r1 = i % 5 ? 96 : 92, r2 = 100;
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", 100 + Math.cos(a) * r1); l.setAttribute("y1", 100 + Math.sin(a) * r1);
    l.setAttribute("x2", 100 + Math.cos(a) * r2); l.setAttribute("y2", 100 + Math.sin(a) * r2);
    ticks.appendChild(l);
  }

  const logItems = $$("#loaderLog li");
  const count = $("#loaderCount");
  const prog = { v: 0 };
  const statuses = ["OK", "OK", "OK", "ONLINE"];
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  const boot = gsap.timeline({ paused: true });
  boot.to(prog, {
    v: 100, duration: 2.4, ease: "power2.inOut",
    onUpdate: () => {
      const v = Math.round(prog.v);
      count.textContent = String(v).padStart(2, "0");
      gsap.set("#loaderRing", { strokeDashoffset: 565.5 * (1 - v / 100) });
      logItems.forEach((li, i) => {
        const thr = (i + 1) * 22;
        if (v >= thr - 18 && !li.dataset.shown) { li.dataset.shown = 1; gsap.to(li, { opacity: 1, duration: 0.3 }); }
        if (v >= thr && !li.dataset.status) li.dataset.status = statuses[i];
      });
    },
  })
    .to(".loader__center", { scale: 0.9, autoAlpha: 0, duration: 0.5, ease: "power3.in" }, "+=0.15")
    .to(".loader__corner", { autoAlpha: 0, duration: 0.3 }, "<")
    // obturador abrindo (duas lâminas)
    .to(loader, { clipPath: "inset(50% 0% 50% 0%)", duration: 1.1, ease: "expo.inOut" })
    .add(() => { start(); heroIntro(); }, "-=0.55")
    .add(() => loader.remove());

  gsap.set(loader, { clipPath: "inset(0% 0% 0% 0%)" });
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(() => boot.play());
})();
