/* ==========================================================
   REPLAY — gravação real com detecção de pessoas (Canal 3)
   Player estilo DVR: linha do tempo, busca inteligente e zoom digital.
   ========================================================== */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hms = (s) => {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return [h, m, x].map((n) => String(n).padStart(2, "0")).join(":");
  };

  // Tempo em segundos do dia. bbox em pixels da imagem original (900x500).
  const T0 = 11 * 3600 + 33 * 60 + 50; // 11:33:50
  const T1 = 12 * 3600 + 9 * 60 + 30;  // 12:09:30
  const EVENTS = [
    { t: 11 * 3600 + 34 * 60 + 20, src: "assets/img/real-01.webp", box: [575, 160, 630, 302], conf: 89, label: "Pessoa detectada na área" },
    { t: 11 * 3600 + 34 * 60 + 50, src: "assets/img/real-02.webp", box: [474, 151, 591, 353], conf: 75, label: "Pessoa manuseando objeto" },
    { t: 12 * 3600 + 8 * 60 + 58, src: "assets/img/real-03.webp", box: [357, 253, 456, 477], conf: 78, label: "Pessoa retorna ao local" },
  ];
  const WINDOW = 22; // segundos de vídeo em volta de cada evento

  const P = { t: T0, playing: true, speed: 4, smart: true, zoom: false, zoomK: 0, jumpFx: 0 };
  let cv, ctx, w, h, dpr, noise, visible = false;

  function makeNoise() {
    const c = document.createElement("canvas");
    c.width = c.height = 200;
    const x = c.getContext("2d");
    const d = x.createImageData(200, 200);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = Math.random() * 70;
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  function current() {
    // evento cuja janela contém t, ou o anterior mais próximo
    let idx = 0;
    for (let i = 0; i < EVENTS.length; i++) if (P.t >= EVENTS[i].t - WINDOW) idx = i;
    const e = EVENTS[idx];
    const inWin = Math.abs(P.t - e.t) <= WINDOW;
    return { e, idx, inWin };
  }

  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = cv.width = Math.round(r.width * dpr);
    h = cv.height = Math.round(r.height * dpr);
  }

  function seek(t) {
    P.t = Math.max(T0, Math.min(T1, t));
    P.jumpFx = 1;
  }

  function step(dt) {
    if (!P.playing) return;
    const rate = 30 * P.speed; // 1x do botão = 30x do tempo real
    let nt = P.t + dt * (current().inWin ? rate / 6 : rate); // desacelera nos eventos
    if (P.smart) {
      const next = EVENTS.find((e) => e.t - WINDOW > P.t);
      const { inWin } = current();
      if (!inWin && next && nt < next.t - WINDOW) {
        nt = next.t - WINDOW;
        P.jumpFx = 1;
        flashTag("BUSCA INTELIGENTE · PRÓXIMO EVENTO");
      }
    }
    if (nt >= T1) { nt = T0; P.jumpFx = 1; }
    P.t = nt;
  }

  let tagT = 0;
  function flashTag(txt) {
    const el = $("#replayTag");
    if (!el) return;
    el.textContent = txt;
    el.classList.add("is-on");
    clearTimeout(tagT);
    tagT = setTimeout(() => el.classList.remove("is-on"), 1300);
  }

  function draw(now) {
    const { e, idx, inWin } = current();
    const img = e.img;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    if (!img || !img.complete || !img.naturalWidth) return;

    // zoom digital suave em direção à pessoa
    const target = P.zoom && inWin ? 1 : 0;
    P.zoomK += (target - P.zoomK) * 0.08;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const [x1, y1, x2, y2] = e.box;
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const zoom = 1 + P.zoomK * 1.6 + (reduced ? 0 : Math.sin(now / 5000) * 0.015);
    const s = Math.max(w / iw, h / ih) * zoom;
    // foco: centro da imagem -> centro da pessoa
    const fx = iw / 2 + (cx - iw / 2) * P.zoomK, fy = ih / 2 + (cy - ih / 2) * P.zoomK;
    let dx = w / 2 - fx * s, dy = h / 2 - fy * s;
    dx = Math.min(0, Math.max(w - iw * s, dx));
    dy = Math.min(0, Math.max(h - ih * s, dy));

    // sem movimento: imagem escurecida
    ctx.globalAlpha = 1;
    ctx.drawImage(img, dx, dy, iw * s, ih * s);
    if (!inWin) {
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = "hsl(0,0%,50%)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.fillRect(0, 0, w, h);
    }

    // caixa de detecção animada
    if (inWin) {
      const bx = dx + x1 * s, by = dy + y1 * s, bw = (x2 - x1) * s, bh = (y2 - y1) * s;
      const pulse = reduced ? 0 : (Math.sin(now / 160) + 1) / 2;
      const pad = 6 * dpr + pulse * 4 * dpr;
      const k = Math.min(bw, bh) * 0.3;
      ctx.strokeStyle = "#ff2a1a";
      ctx.lineWidth = 2.5 * dpr;
      ctx.shadowColor = "#ff2a1a";
      ctx.shadowBlur = 12 * dpr;
      const X = bx - pad, Y = by - pad, BW = bw + pad * 2, BH = bh + pad * 2;
      ctx.beginPath();
      ctx.moveTo(X, Y + k); ctx.lineTo(X, Y); ctx.lineTo(X + k, Y);
      ctx.moveTo(X + BW - k, Y); ctx.lineTo(X + BW, Y); ctx.lineTo(X + BW, Y + k);
      ctx.moveTo(X + BW, Y + BH - k); ctx.lineTo(X + BW, Y + BH); ctx.lineTo(X + BW - k, Y + BH);
      ctx.moveTo(X + k, Y + BH); ctx.lineTo(X, Y + BH); ctx.lineTo(X, Y + BH - k);
      ctx.stroke();
      ctx.shadowBlur = 0;
      const fs = Math.max(10, 11 * dpr);
      ctx.font = `700 ${fs}px "JetBrains Mono", monospace`;
      const lab = `PESSOA ${e.conf}%`;
      const tw = ctx.measureText(lab).width + 10 * dpr;
      let ly = Y - fs - 8 * dpr;
      if (ly < 4) ly = Y + BH + 4 * dpr;
      ctx.fillStyle = "#ff2a1a";
      ctx.fillRect(X, ly, tw, fs + 7 * dpr);
      ctx.fillStyle = "#fff";
      ctx.fillText(lab, X + 5 * dpr, ly + fs + 1 * dpr);
      // linha de varredura
      if (!reduced) {
        const sy = Y + ((now / 900) % 1) * BH;
        ctx.fillStyle = "rgba(255,42,26,.5)";
        ctx.fillRect(X, sy, BW, 1.5 * dpr);
      }
    }

    // ruído, scanlines, efeito de salto
    ctx.globalAlpha = 0.12 + P.jumpFx * 0.4;
    ctx.drawImage(noise, (Math.random() * -200) | 0, (Math.random() * -200) | 0, w + 200, h + 200);
    ctx.globalAlpha = 1;
    if (P.jumpFx > 0.05) {
      for (let i = 0; i < 6; i++) {
        const y = Math.random() * h, hh = (4 + Math.random() * 20) * dpr;
        ctx.drawImage(cv, 0, y, w, hh, (Math.random() - 0.5) * 40 * dpr * P.jumpFx, y, w, hh);
      }
      P.jumpFx *= 0.88;
    }
    ctx.fillStyle = "rgba(0,0,0,.18)";
    for (let y = 0; y < h; y += 3 * dpr) ctx.fillRect(0, y, w, dpr);

    // HUD do player
    const fs = Math.max(10, 12 * dpr);
    ctx.font = `600 ${fs}px "JetBrains Mono", monospace`;
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.fillRect(0, h - fs * 2.4, w, fs * 2.4);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(`▶ ${hms(P.t)}`, 12 * dpr, h - fs * 1.2);
    const st = inWin ? `EVENTO ${idx + 1}/3` : "SEM MOVIMENTO";
    const sw = ctx.measureText(st).width;
    ctx.fillStyle = inWin ? "#ff6b5f" : "rgba(255,255,255,.6)";
    ctx.fillText(st, w - sw - 12 * dpr, h - fs * 1.2);
    ctx.textBaseline = "alphabetic";
  }

  function ui() {
    const p = (P.t - T0) / (T1 - T0);
    $("#replayHead").style.left = `${p * 100}%`;
    $("#replayFill").style.transform = `scaleX(${p})`;
    $("#replayTime").textContent = hms(P.t);
    const { idx, inWin } = current();
    document.querySelectorAll(".replay__log li").forEach((li, i) => li.classList.toggle("is-on", inWin && i === idx));
    document.querySelectorAll(".replay__mark").forEach((m, i) => m.classList.toggle("is-on", inWin && i === idx));
  }

  function init() {
    cv = $("#replayCanvas");
    if (!cv) return;
    ctx = cv.getContext("2d");
    noise = makeNoise();
    EVENTS.forEach((e) => { e.img = new Image(); e.img.src = e.src; });
    resize();
    new ResizeObserver(resize).observe(cv);

    // marcadores na linha do tempo
    const tl = $("#replayTimeline");
    EVENTS.forEach((e, i) => {
      const m = document.createElement("button");
      m.className = "replay__mark";
      m.style.left = `${((e.t - T0) / (T1 - T0)) * 100}%`;
      m.setAttribute("aria-label", `Ir para o evento ${i + 1}, ${hms(e.t)}`);
      m.dataset.cursor = "ir";
      m.addEventListener("click", (ev) => { ev.stopPropagation(); seek(e.t - 3); });
      tl.appendChild(m);
    });
    const seekFromEvent = (ev) => {
      const r = tl.getBoundingClientRect();
      seek(T0 + ((ev.clientX - r.left) / r.width) * (T1 - T0));
    };
    let scrubbing = false;
    tl.addEventListener("pointerdown", (ev) => { scrubbing = true; tl.setPointerCapture(ev.pointerId); seekFromEvent(ev); });
    tl.addEventListener("pointermove", (ev) => { if (scrubbing) seekFromEvent(ev); });
    tl.addEventListener("pointerup", () => (scrubbing = false));

    document.querySelectorAll(".replay__log li").forEach((li, i) =>
      li.addEventListener("click", () => { seek(EVENTS[i].t - 3); P.playing = true; syncPlay(); })
    );

    const play = $("#replayPlay");
    const syncPlay = () => {
      play.textContent = P.playing ? "❚❚" : "▶";
      play.setAttribute("aria-label", P.playing ? "Pausar" : "Reproduzir");
    };
    play.addEventListener("click", () => { P.playing = !P.playing; syncPlay(); });

    document.querySelectorAll("[data-speed]").forEach((b) =>
      b.addEventListener("click", () => {
        P.speed = +b.dataset.speed;
        document.querySelectorAll("[data-speed]").forEach((x) => x.classList.toggle("is-active", x === b));
      })
    );
    const smart = $("#replaySmart");
    smart.addEventListener("click", () => {
      P.smart = !P.smart;
      smart.setAttribute("aria-pressed", String(P.smart));
    });
    const zoomBtn = $("#replayZoom");
    const toggleZoom = () => {
      P.zoom = !P.zoom;
      zoomBtn.setAttribute("aria-pressed", String(P.zoom));
      flashTag(P.zoom ? "ZOOM DIGITAL 2.6x" : "ZOOM 1x");
    };
    zoomBtn.addEventListener("click", toggleZoom);
    cv.addEventListener("click", toggleZoom);

    new IntersectionObserver((e) => {
      visible = e[0].isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }, { rootMargin: "100px" }).observe(cv);

    let last = performance.now(), raf = null;
    function loop(now) {
      if (!visible) { raf = null; return; }
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      draw(now);
      ui();
    }
  }

  window.Replay = { init };
})();
