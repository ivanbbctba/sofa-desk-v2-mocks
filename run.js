(function () {
  var TOTAL = 18;
  var AISLE_X = { A: 40, B: 88, C: 136, D: 184, E: 232, F: 280, G: 328, H: 372 };
  var BACK_Y = 78;
  var FRONT_Y = 620;

  function binY(n) {
    return BACK_Y + (n - 1) * ((FRONT_Y - BACK_Y) / 9);
  }

  function parseLoc(code) {
    var parts = code.split("-");
    return { aisle: parts[0], bin: parseInt(parts[1], 10) };
  }

  function xy(code) {
    var loc = parseLoc(code);
    return [AISLE_X[loc.aisle], binY(loc.bin)];
  }

  var STOPS = [
    { qty: 10, loc: "A-01", next: "C-02" },
    { qty: 8, loc: "C-02", next: "E-01" },
    { qty: 10, loc: "E-01", next: "E-10" },
    { qty: 10, loc: "E-10", next: "F-02" },
    { qty: 42, loc: "F-02", next: "H-09" },
    { qty: 5, loc: "H-09", next: "B-03" },
    { qty: 7, loc: "B-03", next: "B-09" },
    { qty: 5, loc: "B-09", next: "G-01" },
    { qty: 9, loc: "G-01", next: "G-09" },
    { qty: 7, loc: "G-09", next: "C-08" },
    { qty: 6, loc: "C-08", next: "F-10" },
    { qty: 4, loc: "F-10", next: "D-04" },
    { qty: 8, loc: "D-04", next: "D-10" },
    { qty: 3, loc: "D-10", next: "A-06" },
    { qty: 11, loc: "A-06", next: "H-02" },
    { qty: 6, loc: "H-02", next: "A-10" },
    { qty: 4, loc: "A-10", next: "H-10" },
    { qty: 2, loc: "H-10", next: "Fim" }
  ];

  function corridorY(fromCode, toCode) {
    var a = parseLoc(fromCode);
    var b = parseLoc(toCode);
    var y1 = binY(a.bin);
    var y2 = binY(b.bin);
    var viaBack = Math.abs(y1 - BACK_Y) + Math.abs(y2 - BACK_Y);
    var viaFront = Math.abs(y1 - FRONT_Y) + Math.abs(y2 - FRONT_Y);
    return viaBack <= viaFront ? BACK_Y : FRONT_Y;
  }

  function segment(fromCode, toCode) {
    var p1 = xy(fromCode);
    var p2 = xy(toCode);
    if (fromCode.charAt(0) === toCode.charAt(0)) {
      return [p1, p2];
    }
    var via = corridorY(fromCode, toCode);
    var pts = [p1];
    if (Math.abs(p1[1] - via) > 1) pts.push([p1[0], via]);
    pts.push([p2[0], via]);
    if (Math.abs(p2[1] - via) > 1) pts.push(p2);
    return pts;
  }

  function buildRoute() {
    var pts = [];
    var i;
    for (i = 0; i < STOPS.length - 1; i += 1) {
      var seg = segment(STOPS[i].loc, STOPS[i + 1].loc);
      if (pts.length && samePoint(pts[pts.length - 1], seg[0])) {
        pts = pts.concat(seg.slice(1));
      } else {
        pts = pts.concat(seg);
      }
    }
    return pts;
  }

  function samePoint(a, b) {
    return Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5;
  }

  function indexOnRoute(route, code) {
    var target = xy(code);
    var best = 0;
    var bestD = Infinity;
    var i;
    for (i = 0; i < route.length; i += 1) {
      var dx = route[i][0] - target[0];
      var dy = route[i][1] - target[1];
      var d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  function toPath(points) {
    if (!points.length) return "";
    if (points.length === 1) {
      return "M " + points[0][0].toFixed(1) + " " + points[0][1].toFixed(1);
    }
    var radius = 28;
    var d = "M " + points[0][0].toFixed(1) + " " + points[0][1].toFixed(1);
    var i;
    for (i = 1; i < points.length; i += 1) {
      var curr = points[i];
      var prev = points[i - 1];
      var next = points[i + 1];
      if (!next) {
        d += " L " + curr[0].toFixed(1) + " " + curr[1].toFixed(1);
        break;
      }
      var v1x = prev[0] - curr[0];
      var v1y = prev[1] - curr[1];
      var v2x = next[0] - curr[0];
      var v2y = next[1] - curr[1];
      var l1 = Math.hypot(v1x, v1y) || 1;
      var l2 = Math.hypot(v2x, v2y) || 1;
      var rr = Math.min(radius, l1 / 2.2, l2 / 2.2);
      var ax = curr[0] + (v1x / l1) * rr;
      var ay = curr[1] + (v1y / l1) * rr;
      var bx = curr[0] + (v2x / l2) * rr;
      var by = curr[1] + (v2y / l2) * rr;
      d += " L " + ax.toFixed(1) + " " + ay.toFixed(1);
      d += " Q " + curr[0].toFixed(1) + " " + curr[1].toFixed(1) + " " + bx.toFixed(1) + " " + by.toFixed(1);
    }
    return d;
  }

  var app = document.querySelector(".run-app");
  if (!app) return;

  var variant = app.getAttribute("data-variant") || "a";
  var deskHref = app.getAttribute("data-desk") || "index.html";
  var params = new URLSearchParams(window.location.search);
  var index = parseInt(params.get("i") || "6", 10);
  if (isNaN(index) || index < 0) index = 6;
  if (index > STOPS.length - 1) index = STOPS.length - 1;

  var route = buildRoute();
  var solid = document.getElementById("route-solid");
  var dash = document.getElementById("route-dash");
  var nodes = document.getElementById("route-nodes");
  var svg = document.getElementById("route-svg");
  var qtyEl = document.getElementById("hud-qty");
  var locEl = document.getElementById("hud-loc");
  var nextEl = document.getElementById("hud-depois");
  var progressEl = document.getElementById("run-progress");
  var feito = document.getElementById("btn-feito");
  var backBtn = document.getElementById("btn-back");
  var toastEl = document.getElementById("run-toast");
  var peekBody = document.getElementById("peek-body");
  var peekChip = document.getElementById("peek-chip");

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    window.clearTimeout(toast.tid);
    toast.tid = window.setTimeout(function () {
      toastEl.classList.remove("is-on");
    }, 1400);
  }

  function peekText() {
    if (index <= 0) return "Sem parada anterior — início da onda.";
    var prev = STOPS[index - 1];
    return prev.loc + " · " + prev.qty + " un. ok";
  }

  function renderPeek() {
    var text = peekText();
    if (peekBody) {
      peekBody.innerHTML = "<strong>" + text + "</strong>" +
        '<div class="peek-actions"><button type="button" class="linkish" data-act="separar">Separar</button></div>';
    }
    if (peekChip) {
      var back = index > 0
        ? ' <button type="button" class="linkish" data-act="voltar">Voltar</button>'
        : "";
      peekChip.innerHTML = text + back;
    }
  }

  function render() {
    var stop = STOPS[index];
    var here = indexOnRoute(route, stop.loc);
    var nextCode = stop.next === "Fim" ? stop.loc : stop.next;
    var nextPt = indexOnRoute(route, nextCode);
    var solidEnd = Math.max(here, nextPt);
    var solidStart = variant === "c"
      ? 0
      : indexOnRoute(route, STOPS[Math.max(0, index - (index < 3 ? 0 : 2))].loc);
    var dashEnd = Math.min(route.length, nextPt + (variant === "c" ? 18 : 10));
    var solidPts = route.slice(solidStart, solidEnd + 1);
    var dashPts = route.slice(solidEnd, dashEnd);
    if (solidPts.length === 1) solidPts = [solidPts[0], [solidPts[0][0], solidPts[0][1] + 1]];
    solid.setAttribute("d", toPath(solidPts));
    dash.setAttribute("d", dashPts.length > 1 ? toPath(dashPts) : "");
    svg.setAttribute("viewBox", "0 0 390 844");

    var current = xy(stop.loc);
    var html = "";
    var i;
    for (i = 0; i < STOPS.length; i += 1) {
      if (i === index) continue;
      if (variant !== "c" && (i < index - 2 || i > index + 2)) continue;
      var p = xy(STOPS[i].loc);
      if (p[1] > 560) continue;
      var cls = i < index ? "node on-path" : "node upcoming";
      html += '<circle class="' + cls + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i < index ? 5 : 6) + '" />';
    }
    html += '<circle class="node current" cx="' + current[0] + '" cy="' + current[1] + '" r="11" />';
    nodes.innerHTML = html;

    qtyEl.textContent = String(stop.qty);
    locEl.textContent = stop.loc;
    nextEl.textContent = stop.next === "Fim" ? "última parada" : "depois " + stop.next;
    progressEl.textContent = index + " de " + TOTAL;
    if (feito) feito.disabled = false;
    if (backBtn) backBtn.disabled = index <= 0;
    renderPeek();
  }

  function go(nextIndex) {
    if (nextIndex < 0 || nextIndex >= STOPS.length) return;
    index = nextIndex;
    var url = new URL(window.location.href);
    url.searchParams.set("i", String(index));
    window.history.replaceState({}, "", url);
    render();
  }

  if (feito) {
    feito.addEventListener("click", function () {
      if (index >= STOPS.length - 1) {
        toast("Onda concluída");
        window.setTimeout(function () {
          window.location.href = deskHref;
        }, 700);
        return;
      }
      go(index + 1);
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", function () {
      go(index - 1);
    });
  }

  var peekToggle = document.getElementById("peek-toggle");
  if (peekToggle && peekBody) {
    peekToggle.addEventListener("click", function () {
      var open = peekBody.classList.toggle("is-open");
      peekToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var peekEdge = document.getElementById("peek-edge");
  if (peekEdge && peekChip) {
    peekEdge.addEventListener("click", function () {
      peekChip.classList.toggle("is-open");
    });
  }

  var menu = document.getElementById("menu-c");
  var pop = document.getElementById("menu-c-pop");
  if (menu && pop) {
    menu.addEventListener("click", function () {
      pop.classList.toggle("is-open");
    });
  }

  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest("[data-act]") : null;
    if (!el) return;
    var act = el.getAttribute("data-act");
    if (act === "share") {
      toast("Link copiado");
      if (pop) pop.classList.remove("is-open");
    }
    if (act === "separar") {
      toast("Separar — secundário");
      if (pop) pop.classList.remove("is-open");
    }
    if (act === "peek") {
      toast(peekText());
      if (pop) pop.classList.remove("is-open");
    }
    if (act === "voltar") {
      if (peekChip) peekChip.classList.add("is-open");
      go(index - 1);
    }
  });

  render();
})();
