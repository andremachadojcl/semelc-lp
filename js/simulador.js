/* ==========================================================
   SIMULADOR SEMELC — monte a proteção do patrimônio e teste à noite
   Canvas 2D, coordenadas de projeto em 1000 x 700.
   ========================================================== */
(function () {
  "use strict";

  const W = 1000, H = 700;
  const CAM = { range: 260, fov: (78 * Math.PI) / 180 };
  const SENSOR_R = 95;
  const MAX_DEVICES = 10;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const rect = (x, y, w, h, label) => ({ x, y, w, h, label });

  /* ---------- Plantas ---------- */
  const MAPS = {
    casa: {
      name: "Residência",
      lot: rect(80, 60, 840, 580),
      buildings: [rect(330, 200, 340, 230, "Casa")],
      entrances: [
        { id: "g1", label: "Portão da garagem", a: [180, 640], b: [320, 640] },
        { id: "g2", label: "Portão social", a: [560, 640], b: [620, 640] },
      ],
      zones: [
        { id: "z1", label: "Garagem", x: 250, y: 545 },
        { id: "z2", label: "Porta da frente", x: 500, y: 465 },
        { id: "z3", label: "Quintal", x: 500, y: 125 },
        { id: "z4", label: "Corredor lateral", x: 800, y: 320 },
        { id: "z5", label: "Janelas laterais", x: 215, y: 300 },
      ],
      paths: [
        [[500, -20], [500, 60], [500, 125], [520, 190]],
        [[1020, 330], [920, 330], [800, 320], [690, 320]],
        [[250, 720], [250, 640, "g1"], [250, 545], [320, 470]],
        [[590, 720], [590, 640, "g2"], [500, 465]],
        [[-20, 300], [80, 300], [215, 300], [320, 300]],
      ],
      suggestion: [
        { t: "cam", x: 335, y: 445, tx: 250, ty: 560 },
        { t: "cam", x: 665, y: 445, tx: 520, ty: 520 },
        { t: "cam", x: 680, y: 190, tx: 820, ty: 330 },
        { t: "cam", x: 320, y: 190, tx: 500, ty: 110 },
        { t: "sensor", x: 230, y: 300 },
        { t: "access", e: "g1" },
        { t: "access", e: "g2" },
      ],
    },
    empresa: {
      name: "Empresa",
      lot: rect(60, 60, 880, 580),
      buildings: [rect(380, 120, 500, 300, "Galpão · Estoque"), rect(120, 120, 210, 180, "Escritório")],
      entrances: [
        { id: "g1", label: "Portão de veículos", a: [600, 640], b: [760, 640] },
        { id: "g2", label: "Entrada de pessoas", a: [160, 640], b: [220, 640] },
      ],
      zones: [
        { id: "z1", label: "Doca", x: 630, y: 470 },
        { id: "z2", label: "Estoque", x: 630, y: 270 },
        { id: "z3", label: "Recepção", x: 225, y: 340 },
        { id: "z4", label: "Estacionamento", x: 320, y: 545 },
        { id: "z5", label: "Pátio", x: 860, y: 560 },
      ],
      paths: [
        [[680, 720], [680, 640, "g1"], [630, 470], [630, 425], [630, 270]],
        [[1020, 500], [940, 500], [860, 560], [700, 470]],
        [[190, 720], [190, 640, "g2"], [225, 340], [225, 305]],
        [[-20, 470], [60, 470], [320, 545], [380, 430]],
        [[630, -20], [630, 60], [630, 115]],
      ],
      suggestion: [
        { t: "cam", x: 600, y: 430, tx: 700, ty: 560 },
        { t: "cam", x: 875, y: 430, tx: 860, ty: 600 },
        { t: "cam", x: 340, y: 430, tx: 260, ty: 560 },
        { t: "cam", x: 120, y: 330, tx: 260, ty: 360 },
        { t: "cam", x: 380, y: 112, tx: 640, ty: 75 },
        { t: "sensor", x: 630, y: 290 },
        { t: "access", e: "g1" },
        { t: "access", e: "g2" },
      ],
    },
    rural: {
      name: "Propriedade rural",
      lot: rect(40, 40, 920, 620),
      buildings: [rect(120, 110, 180, 140, "Sede"), rect(620, 120, 240, 180, "Galpão")],
      entrances: [
        { id: "g1", label: "Porteira principal", a: [440, 660], b: [540, 660] },
        { id: "g2", label: "Porteira dos fundos", a: [960, 430], b: [960, 500] },
      ],
      zones: [
        { id: "z1", label: "Porteira", x: 490, y: 600 },
        { id: "z2", label: "Maquinário", x: 740, y: 345 },
        { id: "z3", label: "Curral", x: 280, y: 500 },
        { id: "z4", label: "Sede", x: 210, y: 285 },
        { id: "z5", label: "Estrada interna", x: 520, y: 400 },
      ],
      paths: [
        [[490, 720], [490, 660, "g1"], [490, 600], [520, 400], [740, 345]],
        [[1020, 465], [960, 465, "g2"], [860, 420], [740, 345]],
        [[-20, 500], [40, 500], [280, 500], [400, 470]],
        [[210, -20], [210, 40], [210, 260], [210, 285]],
        [[1020, 120], [960, 120], [900, 330], [760, 345]],
      ],
      suggestion: [
        { t: "cam", x: 560, y: 650, tx: 490, ty: 420 },
        { t: "cam", x: 610, y: 310, tx: 740, ty: 360 },
        { t: "cam", x: 870, y: 310, tx: 900, ty: 450 },
        { t: "cam", x: 300, y: 260, tx: 280, ty: 500 },
        { t: "cam", x: 110, y: 262, tx: 215, ty: 300 },
        { t: "cam", x: 50, y: 650, tx: 200, ty: 520 },
        { t: "access", e: "g1" },
        { t: "access", e: "g2" },
      ],
    },
  };

  /* ---------- Geometria ---------- */
  const inside = (r, x, y) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  function segHitsRect(x1, y1, x2, y2, r) {
    // Liang–Barsky
    let t0 = 0, t1 = 1;
    const dx = x2 - x1, dy = y2 - y1;
    const p = [-dx, dx, -dy, dy];
    const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; continue; }
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  }
  function los(map, x1, y1, x2, y2) {
    for (const b of map.buildings) {
      const a = inside(b, x1, y1), c = inside(b, x2, y2);
      if (a && c) continue;
      if (a !== c) return false;
      if (segHitsRect(x1, y1, x2, y2, b)) return false;
    }
    return true;
  }
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  function sees(map, d, x, y) {
    if (d.t === "cam") {
      const dist = Math.hypot(x - d.x, y - d.y);
      if (dist > CAM.range) return false;
      if (Math.abs(angDiff(Math.atan2(y - d.y, x - d.x), d.a)) > CAM.fov / 2) return false;
      return los(map, d.x, d.y, x, y);
    }
    if (d.t === "sensor") {
      if (Math.hypot(x - d.x, y - d.y) > SENSOR_R) return false;
      return los(map, d.x, d.y, x, y);
    }
    return false;
  }

  /* ---------- Estado ---------- */
  const S = {
    mapKey: "casa",
    tool: "cam",
    devices: [],
    drag: null,
    hover: null,
    mode: "edit", // edit | test | done
    test: null,
    t: 0,
  };
  let cv, ctx, scale = 1, ox = 0, oy = 0, dpr = 1;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const map = () => MAPS[S.mapKey];

  function toast(msg) {
    const t = $("#simToast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("is-on"), 2200);
  }

  function nearestZone(x, y) {
    let best = null, bd = 1e9;
    for (const z of map().zones) {
      const d = Math.hypot(z.x - x, z.y - y);
      if (d < bd && d > 20) { bd = d; best = z; }
    }
    return best;
  }

  function addDevice(t, x, y) {
    if (S.devices.length >= MAX_DEVICES) { toast(`Limite de ${MAX_DEVICES} equipamentos nesta simulação`); return; }
    if (t === "access") {
      let best = null, bd = 1e9;
      for (const e of map().entrances) {
        const mx = (e.a[0] + e.b[0]) / 2, my = (e.a[1] + e.b[1]) / 2;
        const d = Math.hypot(mx - x, my - y);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best || bd > 110) { toast("Controle de acesso vai em portões e portarias"); return; }
      if (S.devices.some((d) => d.t === "access" && d.e === best.id)) { toast("Esse acesso já está controlado"); return; }
      S.devices.push({ t, e: best.id });
    } else {
      const d = { t, x: clamp(x, 10, W - 10), y: clamp(y, 10, H - 10) };
      if (t === "cam") {
        const z = nearestZone(x, y);
        d.a = z ? Math.atan2(z.y - y, z.x - x) : -Math.PI / 2;
      }
      S.devices.push(d);
    }
    if (window.gsap && !reduced) {
      const dev = S.devices[S.devices.length - 1];
      dev.pop = 0;
      gsap.to(dev, { pop: 1, duration: 0.6, ease: "elastic.out(1,.5)" });
    }
    resetResult();
    update();
  }

  function entrancePos(id) {
    const e = map().entrances.find((x) => x.id === id);
    return { x: (e.a[0] + e.b[0]) / 2, y: (e.a[1] + e.b[1]) / 2, e };
  }

  function deviceAt(x, y) {
    for (let i = S.devices.length - 1; i >= 0; i--) {
      const d = S.devices[i];
      const p = d.t === "access" ? entrancePos(d.e) : d;
      if (Math.hypot(p.x - x, p.y - y) < 26 / Math.min(1, scale * 1.4)) return { d, i, part: "body" };
      if (d.t === "cam") {
        const hx = d.x + Math.cos(d.a) * 90, hy = d.y + Math.sin(d.a) * 90;
        if (Math.hypot(hx - x, hy - y) < 22 / Math.min(1, scale * 1.4)) return { d, i, part: "rot" };
      }
    }
    return null;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Avaliação ---------- */
  function evaluate() {
    const m = map();
    const zones = m.zones.map((z) => ({ z, ok: S.devices.some((d) => sees(m, d, z.x, z.y)) }));
    const ents = m.entrances.map((e) => ({ e, ok: S.devices.some((d) => d.t === "access" && d.e === e.id) }));
    const zc = zones.filter((x) => x.ok).length / zones.length;
    const ec = ents.filter((x) => x.ok).length / ents.length;
    const score = Math.round(100 * (0.75 * zc + 0.25 * ec));
    return { zones, ents, score };
  }

  function counts() {
    const c = { cam: 0, sensor: 0, access: 0 };
    S.devices.forEach((d) => c[d.t]++);
    return c;
  }

  function summaryMsg(res) {
    const c = counts();
    const parts = [];
    if (c.cam) parts.push(`${c.cam} câmera${c.cam > 1 ? "s" : ""}`);
    if (c.sensor) parts.push(`${c.sensor} sensor${c.sensor > 1 ? "es" : ""} de alarme`);
    if (c.access) parts.push(`${c.access} controle${c.access > 1 ? "s" : ""} de acesso`);
    let msg = `Olá! Fiz a simulação no site da Semelc para ${map().name.toLowerCase()}: ${parts.join(", ") || "sem equipamentos"} (proteção estimada de ${res.score}%).`;
    if (S.test && S.mode === "done") msg += ` No teste noturno, ${S.test.stopped} de ${S.test.list.length} tentativas foram detectadas ou bloqueadas.`;
    return msg + " Gostaria de uma avaliação do meu projeto.";
  }

  let ringC = 0;
  function update() {
    const res = evaluate();
    const c = counts();
    $("#simCount").textContent = `${S.devices.length}/${MAX_DEVICES}`;
    $$("[data-sim-count]").forEach((el) => (el.textContent = c[el.dataset.simCount]));
    const sc = $("#simScore");
    const o = { v: parseInt(sc.textContent, 10) || 0 };
    if (window.gsap) gsap.to(o, { v: res.score, duration: 0.6, ease: "power2.out", onUpdate: () => (sc.textContent = Math.round(o.v)) });
    else sc.textContent = res.score;
    const ring = $("#simRing");
    if (!ringC) ringC = 2 * Math.PI * 52;
    ring.style.strokeDashoffset = ringC * (1 - res.score / 100);
    $("#simLevel").textContent =
      res.score >= 90 ? "Projeto muito bem protegido" :
      res.score >= 70 ? "Boa proteção, ainda há pontos cegos" :
      res.score >= 40 ? "Proteção parcial" : "Patrimônio vulnerável";
    const list = $("#simChecklist");
    list.innerHTML =
      res.zones.map((x) => `<li class="${x.ok ? "ok" : ""}"><i></i>${x.z.label}</li>`).join("") +
      res.ents.map((x) => `<li class="${x.ok ? "ok" : ""}"><i></i>${x.e.label}<small>acesso</small></li>`).join("");
    const cta = $("#simCta");
    cta.dataset.msg = summaryMsg(res);
    if (window.SemelcWireCta) window.SemelcWireCta(cta);
    return res;
  }

  function resetResult() {
    if (S.mode === "done") {
      S.mode = "edit";
      S.test = null;
      $("#simResult").hidden = true;
      setStep(1);
    }
  }

  function setStep(n) {
    $$(".sim__steps li").forEach((li, i) => li.classList.toggle("is-on", i < n));
  }

  /* ---------- Teste noturno ---------- */
  function startTest() {
    if (S.mode === "test") return;
    if (!S.devices.length) { toast("Posicione pelo menos um equipamento"); return; }
    S.mode = "test";
    setStep(2);
    $("#simResult").hidden = true;
    const m = map();
    const list = m.paths.map((p, i) => {
      // pré-calcula comprimento
      const pts = p.map((q) => ({ x: q[0], y: q[1], gate: q[2] }));
      let len = 0;
      for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
      return { pts, len, s: 0, delay: i * 0.9, state: "walk", trail: [], x: pts[0].x, y: pts[0].y, by: null };
    });
    S.test = { list, t: 0, stopped: 0, clock: 0, log: [] };
    $("#simLog").innerHTML = "";
    $("#simTest").disabled = true;
    $("#simTest").querySelector("span").textContent = "Testando…";
  }

  function logLine(html, cls) {
    const li = document.createElement("li");
    li.className = cls || "";
    const h = 1 + Math.floor(S.test.clock / 60), m = Math.floor(S.test.clock % 60);
    li.innerHTML = `<b>0${h}:${String(m).padStart(2, "0")}</b> ${html}`;
    $("#simLog").prepend(li);
  }

  function stepTest(dt) {
    const T = S.test, m = map();
    T.t += dt;
    T.clock += dt * 9;
    let active = 0;
    for (const it of T.list) {
      if (T.t < it.delay) { active++; continue; }
      if (it.state === "blocked" || it.state === "end") continue;
      active++;
      it.s += 150 * dt;
      // posição ao longo do caminho
      let acc = 0, x = it.pts[0].x, y = it.pts[0].y, done = true;
      for (let k = 1; k < it.pts.length; k++) {
        const a = it.pts[k - 1], b = it.pts[k];
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        if (it.s <= acc + l) {
          const f = (it.s - acc) / l;
          x = a.x + (b.x - a.x) * f; y = a.y + (b.y - a.y) * f;
          // passou por portão?
          if (b.gate && f > 0.92 && S.devices.some((d) => d.t === "access" && d.e === b.gate) && it.state === "walk") {
            it.state = "blocked";
            const e = m.entrances.find((q) => q.id === b.gate);
            T.stopped++;
            logLine(`Acesso negado em <em>${e.label}</em>`, "ok");
          }
          done = false;
          break;
        }
        acc += l;
      }
      if (done) { const l = it.pts[it.pts.length - 1]; x = l.x; y = l.y; }
      it.x = x; it.y = y;
      it.trail.push([x, y]);
      if (it.trail.length > 40) it.trail.shift();
      if (it.state === "walk" && x > m.lot.x - 5 && x < m.lot.x + m.lot.w + 5 && y > m.lot.y - 5 && y < m.lot.y + m.lot.h + 5) {
        const dev = S.devices.find((d) => sees(m, d, x, y));
        if (dev) {
          it.state = "seen";
          it.by = dev;
          dev.flash = 1;
          T.stopped++;
          const n = S.devices.filter((d) => d.t === dev.t).indexOf(dev) + 1;
          logLine(dev.t === "cam" ? `CAM ${String(n).padStart(2, "0")} detectou movimento` : `Sensor ${n} disparou o alarme`, "ok");
        }
      }
      if (done && it.state !== "blocked") {
        if (it.state === "walk") logLine("Tentativa <em>não detectada</em>", "bad");
        it.state = it.state === "seen" ? "end" : "end-miss";
        if (it.state === "end-miss") it.state = "end", it.miss = true;
      }
    }
    if (!active) finishTest();
  }

  function finishTest() {
    S.mode = "done";
    setStep(3);
    const T = S.test;
    const res = update();
    const total = T.list.length;
    $("#simResultTitle").textContent = T.stopped === total ? "Nenhuma tentativa passou despercebida" : `${total - T.stopped} tentativa${total - T.stopped > 1 ? "s" : ""} sem detecção`;
    $("#simResultText").textContent = `${T.stopped} de ${total} tentativas foram detectadas ou bloqueadas. Proteção estimada: ${res.score}%.`;
    $("#simResult").hidden = false;
    $("#simTest").disabled = false;
    $("#simTest").querySelector("span").textContent = "Testar de novo";
    if (window.gsap) gsap.from("#simResult", { y: 20, autoAlpha: 0, duration: 0.6, ease: "power3.out" });
  }

  /* ---------- Desenho ---------- */
  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    scale = Math.min(r.width / W, r.height / H);
    ox = (r.width - W * scale) / 2;
    oy = (r.height - H * scale) / 2;
  }

  function toWorld(e) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left - ox) / scale, y: (e.clientY - r.top - oy) / scale };
  }

  // tamanho de UI independente da escala (fica legível no celular)
  const ui = (px) => px / Math.max(scale, 0.55);

  function drawIcon(type, x, y, active, flash, pop = 1) {
    const r = ui(15) * pop;
    ctx.save();
    ctx.translate(x, y);
    if (flash > 0) {
      ctx.beginPath(); ctx.arc(0, 0, r + ui(18) * (1 - flash), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(25,195,125,${flash})`; ctx.lineWidth = ui(3); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = type === "access" ? "#19c37d" : "#e3120b";
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = ui(14);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (active) { ctx.lineWidth = ui(2.5); ctx.strokeStyle = "#fff"; ctx.stroke(); }
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#fff"; ctx.lineWidth = ui(1.8);
    const k = ui(1);
    if (type === "cam") {
      ctx.fillRect(-7 * k, -4 * k, 11 * k, 8 * k);
      ctx.beginPath(); ctx.moveTo(4 * k, -1 * k); ctx.lineTo(8 * k, -4 * k); ctx.lineTo(8 * k, 4 * k); ctx.lineTo(4 * k, 1 * k); ctx.fill();
    } else if (type === "sensor") {
      ctx.beginPath(); ctx.arc(0, 0, 3 * k, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 7 * k, -2.2, -0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 7 * k, 0.9, 2.2); ctx.stroke();
    } else {
      ctx.strokeRect(-5 * k, -1 * k, 10 * k, 8 * k);
      ctx.beginPath(); ctx.arc(0, -1 * k, 4 * k, Math.PI, 0); ctx.stroke();
    }
    ctx.restore();
  }

  function draw(now) {
    const m = map();
    const night = S.mode !== "edit";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);

    // grade
    ctx.fillStyle = night ? "#07080b" : "#0f1116";
    ctx.fillRect(-ox / scale, -oy / scale, cv.width / dpr / scale, cv.height / dpr / scale);
    ctx.strokeStyle = "rgba(255,255,255,.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 25) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += 25) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // terreno
    const L = m.lot;
    ctx.fillStyle = night ? "rgba(255,255,255,.015)" : "rgba(255,255,255,.03)";
    ctx.fillRect(L.x, L.y, L.w, L.h);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(L.x, L.y, L.w, L.h);
    ctx.setLineDash([]);

    // portões
    for (const e of m.entrances) {
      const ok = S.devices.some((d) => d.t === "access" && d.e === e.id);
      ctx.strokeStyle = ok ? "#19c37d" : "#ffb02e";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(e.a[0], e.a[1]); ctx.lineTo(e.b[0], e.b[1]); ctx.stroke();
      ctx.lineCap = "butt";
      ctx.font = `700 ${ui(11)}px "Nunito Sans", sans-serif`;
      ctx.fillStyle = ok ? "#19c37d" : "#ffb02e";
      const mx = (e.a[0] + e.b[0]) / 2, my = (e.a[1] + e.b[1]) / 2;
      const vertical = e.a[0] === e.b[0];
      ctx.textAlign = vertical ? "right" : "center";
      ctx.fillText(e.label.toUpperCase(), vertical ? mx - ui(16) : mx, vertical ? my + ui(4) : my + ui(22));
    }

    // cobertura das câmeras e sensores
    for (const d of S.devices) {
      if (d.t === "cam") {
        ctx.save();
        // recorta a sombra dos prédios aproximando o cone por raios
        const steps = 36;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        for (let i = 0; i <= steps; i++) {
          const a = d.a - CAM.fov / 2 + (CAM.fov * i) / steps;
          let r = CAM.range;
          for (let s = 8; s <= CAM.range; s += 8) {
            if (!los(m, d.x, d.y, d.x + Math.cos(a) * s, d.y + Math.sin(a) * s)) { r = s - 8; break; }
          }
          ctx.lineTo(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r);
        }
        ctx.closePath();
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, CAM.range);
        const al = night ? 0.32 : 0.24;
        g.addColorStop(0, `rgba(255,42,26,${al})`);
        g.addColorStop(1, "rgba(255,42,26,0.02)");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,42,26,.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } else if (d.t === "sensor") {
        ctx.beginPath(); ctx.arc(d.x, d.y, SENSOR_R, 0, Math.PI * 2);
        ctx.fillStyle = night ? "rgba(255,42,26,.14)" : "rgba(255,42,26,.08)";
        ctx.fill();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "rgba(255,42,26,.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        if (!reduced) {
          const p = (now / 1600) % 1;
          ctx.beginPath(); ctx.arc(d.x, d.y, SENSOR_R * p, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,42,26,${0.4 * (1 - p)})`;
          ctx.stroke();
        }
      }
    }

    // prédios (por cima da cobertura)
    for (const b of m.buildings) {
      ctx.fillStyle = "#1a1d25";
      ctx.strokeStyle = "rgba(255,255,255,.28)";
      ctx.lineWidth = 2;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "rgba(255,255,255,.04)";
      for (let x = b.x + 10; x < b.x + b.w; x += 16) ctx.fillRect(x, b.y, 1, b.h);
      ctx.font = `800 ${ui(12)}px "Nunito Sans", sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.textAlign = "center";
      ctx.fillText(b.label.toUpperCase(), b.x + b.w / 2, b.y + ui(20));
    }
    // sensores dentro dos prédios ficam visíveis por cima
    for (const d of S.devices) {
      if (d.t === "sensor" && m.buildings.some((b) => inside(b, d.x, d.y))) {
        ctx.save();
        const b = m.buildings.find((q) => inside(q, d.x, d.y));
        ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
        ctx.beginPath(); ctx.arc(d.x, d.y, SENSOR_R, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,42,26,.16)"; ctx.fill();
        ctx.restore();
      }
    }

    // pontos críticos
    const res = S._res || evaluate();
    for (const zr of res.zones) {
      const z = zr.z;
      const ok = zr.ok;
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.beginPath(); ctx.arc(0, 0, ui(13), 0, Math.PI * 2);
      ctx.fillStyle = ok ? "rgba(25,195,125,.22)" : "rgba(255,176,46,.15)";
      ctx.fill();
      ctx.rotate(reduced ? 0 : now / 1400);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = ok ? "#19c37d" : "#ffb02e";
      ctx.lineWidth = ui(2);
      ctx.beginPath(); ctx.arc(0, 0, ui(13), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);
      ctx.fillStyle = ok ? "#19c37d" : "#ffb02e";
      ctx.font = `800 ${ui(11)}px "Nunito Sans", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(ok ? "✓" : "!", z.x, z.y + ui(4));
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.font = `700 ${ui(11)}px "Nunito Sans", sans-serif`;
      ctx.fillText(z.label, z.x, z.y + ui(30));
    }

    // dispositivos
    for (const d of S.devices) {
      const p = d.t === "access" ? entrancePos(d.e) : d;
      const active = S.drag && S.drag.d === d;
      if (d.t === "cam" && S.mode === "edit") {
        const hx = d.x + Math.cos(d.a) * 90, hy = d.y + Math.sin(d.a) * 90;
        ctx.strokeStyle = "rgba(255,255,255,.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(hx, hy, ui(7), 0, Math.PI * 2);
        ctx.fillStyle = "#fff"; ctx.fill();
        ctx.beginPath(); ctx.arc(hx, hy, ui(3), 0, Math.PI * 2);
        ctx.fillStyle = "#e3120b"; ctx.fill();
      }
      drawIcon(d.t, p.x, p.y, active, d.flash || 0, d.pop == null ? 1 : d.pop);
      if (d.flash) d.flash = Math.max(0, d.flash - 0.02);
    }

    // prévia da ferramenta
    if (S.mode === "edit" && S.hover && !S.drag && S.tool !== "erase") {
      ctx.globalAlpha = 0.45;
      if (S.tool === "access") {
        const e = m.entrances.map((q) => ({ q, d: Math.hypot((q.a[0] + q.b[0]) / 2 - S.hover.x, (q.a[1] + q.b[1]) / 2 - S.hover.y) })).sort((a, b) => a.d - b.d)[0];
        if (e && e.d < 110) { const p = entrancePos(e.q.id); drawIcon("access", p.x, p.y); }
      } else if (!deviceAt(S.hover.x, S.hover.y)) drawIcon(S.tool, S.hover.x, S.hover.y);
      ctx.globalAlpha = 1;
    }

    // teste noturno: invasores
    if (S.test) {
      for (const it of S.test.list) {
        if (S.test.t < it.delay && S.mode === "test") continue;
        const col = it.state === "blocked" || it.state === "seen" || (it.state === "end" && !it.miss) ? "#19c37d" : "#ffb02e";
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        it.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.globalAlpha = 1;
        const blink = it.state === "walk" ? (Math.sin(now / 80) > 0 ? 1 : 0.5) : 1;
        ctx.beginPath(); ctx.arc(it.x, it.y, ui(7), 0, Math.PI * 2);
        ctx.fillStyle = it.state === "walk" ? `rgba(255,255,255,${blink})` : col;
        ctx.fill();
        if (it.state === "seen" || it.state === "blocked" || it.state === "end") {
          ctx.font = `800 ${ui(10)}px "JetBrains Mono", monospace`;
          ctx.textAlign = "center";
          ctx.fillStyle = col;
          const label = it.state === "blocked" ? "BLOQUEADO" : it.miss ? "NÃO DETECTADO" : "DETECTADO";
          ctx.fillText(label, it.x, it.y - ui(14));
          if (!it.miss) {
            ctx.strokeStyle = col; ctx.lineWidth = ui(1.5);
            const k = ui(14);
            ctx.strokeRect(it.x - k, it.y - k, k * 2, k * 2);
          }
        }
      }
    }

    // vinheta noturna
    if (night) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.2, cv.width / 2, cv.height / 2, cv.width * 0.7);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,.55)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cv.width, cv.height);
    }
  }

  /* ---------- Eventos ---------- */
  function bind() {
    cv.addEventListener("pointerdown", (e) => {
      if (S.mode === "test") return;
      resetResult();
      const p = toWorld(e);
      const hit = deviceAt(p.x, p.y);
      if (S.tool === "erase" || (hit && e.detail >= 2)) {
        if (hit) { S.devices.splice(hit.i, 1); update(); }
        return;
      }
      if (hit) {
        S.drag = { d: hit.d, part: hit.part, moved: false };
        cv.setPointerCapture(e.pointerId);
        return;
      }
      addDevice(S.tool, p.x, p.y);
      const last = S.devices[S.devices.length - 1];
      if (last && last.t === "cam") { S.drag = { d: last, part: "rot", moved: false, fresh: true }; cv.setPointerCapture(e.pointerId); }
    });
    cv.addEventListener("pointermove", (e) => {
      const p = toWorld(e);
      S.hover = p;
      if (!S.drag) {
        const hit = S.mode === "edit" ? deviceAt(p.x, p.y) : null;
        cv.style.cursor = S.mode !== "edit" ? "default" : hit ? (hit.part === "rot" ? "grab" : "move") : "crosshair";
        return;
      }
      const d = S.drag.d;
      S.drag.moved = true;
      if (S.drag.part === "rot") d.a = Math.atan2(p.y - d.y, p.x - d.x);
      else if (d.t !== "access") { d.x = clamp(p.x, 10, W - 10); d.y = clamp(p.y, 10, H - 10); }
      S._res = null;
      throttleUpdate();
    });
    const end = () => { if (S.drag) { S.drag = null; update(); } };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", () => (S.hover = null));
    cv.addEventListener("wheel", (e) => {
      const p = toWorld(e);
      const hit = deviceAt(p.x, p.y);
      if (hit && hit.d.t === "cam") { e.preventDefault(); hit.d.a += e.deltaY * 0.004; update(); }
    }, { passive: false });

    $$("[data-sim-tool]").forEach((b) =>
      b.addEventListener("click", () => {
        S.tool = b.dataset.simTool;
        $$("[data-sim-tool]").forEach((x) => x.classList.toggle("is-active", x === b));
        const hints = {
          cam: "Clique na planta para instalar. Arraste para mover e use a alça branca para girar.",
          sensor: "Sensores detectam movimento em volta, inclusive dentro de construções.",
          access: "Clique perto de um portão para controlar quem entra.",
          erase: "Clique em um equipamento para removê-lo.",
        };
        $("#simHint").textContent = hints[S.tool];
      })
    );
    $$("[data-sim-map]").forEach((b) =>
      b.addEventListener("click", () => {
        S.mapKey = b.dataset.simMap;
        $$("[data-sim-map]").forEach((x) => {
          x.classList.toggle("is-active", x === b);
          x.setAttribute("aria-selected", String(x === b));
        });
        S.devices = [];
        S.test = null;
        S.mode = "edit";
        $("#simResult").hidden = true;
        $("#simLog").innerHTML = "";
        setStep(1);
        update();
        if (window.gsap) gsap.fromTo(cv, { autoAlpha: 0.3, scale: 0.98 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power3.out" });
      })
    );
    $("#simSuggest").addEventListener("click", () => {
      resetResult();
      S.devices = [];
      map().suggestion.forEach((s, i) => {
        const d = s.t === "access" ? { t: "access", e: s.e } : { t: s.t, x: s.x, y: s.y, a: s.t === "cam" ? Math.atan2(s.ty - s.y, s.tx - s.x) : 0 };
        d.pop = 0;
        S.devices.push(d);
        if (window.gsap) gsap.to(d, { pop: 1, duration: 0.6, delay: i * 0.08, ease: "elastic.out(1,.5)" });
        else d.pop = 1;
      });
      update();
      toast("Sugestão aplicada. Ajuste à vontade e teste à noite.");
    });
    $("#simClear").addEventListener("click", () => { resetResult(); S.devices = []; S.test = null; $("#simLog").innerHTML = ""; update(); });
    $("#simTest").addEventListener("click", startTest);
  }

  let updT = 0;
  function throttleUpdate() {
    const n = performance.now();
    if (n - updT > 120) { updT = n; update(); }
  }

  function init() {
    cv = $("#simCanvas");
    if (!cv) return;
    ctx = cv.getContext("2d");
    resize();
    new ResizeObserver(resize).observe(cv);
    bind();
    update();
    let last = performance.now(), visible = false, raf = null;
    const loop = (t) => {
      if (!visible) { raf = null; return; }
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (S.mode === "test") stepTest(dt);
      draw(t);
    };
    new IntersectionObserver((e) => {
      visible = e[0].isIntersecting;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }, { rootMargin: "100px" }).observe(cv);
  }

  window.Simulador = { init };
})();
