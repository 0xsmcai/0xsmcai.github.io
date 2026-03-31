// factory-splash.js — Pretext ASCII art splash with cycling text overlay
// Background: Somnai-style particle attractor ASCII art (proportional font via pretext)
// Foreground: cycling text overlay ("SMCFactory", "$SMCF", contract address)
import { prepareWithSegments } from "./pretext.js";

// ── Config ──
var COLS = 60;
var ROWS = 30;
var FONT_SIZE = 13;
var LINE_HEIGHT = 15;
var TARGET_ROW_W = 480;
var PROP_FAMILY = 'Georgia, Palatino, "Times New Roman", serif';
var CANVAS_W = 240;
var CANVAS_H = 120;
var PARTICLE_N = 120;
var SPRITE_R = 14;
var CHARSET = " .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$";
var WEIGHTS = [300, 500, 800];
var STYLES = ["normal", "italic"];

// ── Brightness measurement ──
var bCvs = document.createElement("canvas");
bCvs.width = bCvs.height = 28;
var bCtx = bCvs.getContext("2d", { willReadFrequently: true });

function estimateBrightness(ch, font) {
  var s = 28;
  bCtx.clearRect(0, 0, s, s);
  bCtx.font = font;
  bCtx.fillStyle = "#fff";
  bCtx.textBaseline = "middle";
  bCtx.fillText(ch, 1, s / 2);
  var d = bCtx.getImageData(0, 0, s, s).data;
  var sum = 0;
  for (var i = 3; i < d.length; i += 4) sum += d[i];
  return sum / (255 * s * s);
}

function measureWidth(ch, font) {
  var p = prepareWithSegments(ch, font);
  return p.widths.length > 0 ? p.widths[0] : 0;
}

// ── Build character palette ──
var palette = [];
for (var si = 0; si < STYLES.length; si++) {
  var style = STYLES[si];
  for (var wi = 0; wi < WEIGHTS.length; wi++) {
    var weight = WEIGHTS[wi];
    var font = (style === "italic" ? "italic " : "") + weight + " " + FONT_SIZE + "px " + PROP_FAMILY;
    for (var ci = 0; ci < CHARSET.length; ci++) {
      var ch = CHARSET[ci];
      if (ch === " ") continue;
      var w = measureWidth(ch, font);
      if (w <= 0) continue;
      var brightness = estimateBrightness(ch, font);
      palette.push({ char: ch, weight: weight, style: style, font: font, width: w, brightness: brightness });
    }
  }
}

var maxB = 0;
for (var i = 0; i < palette.length; i++) if (palette[i].brightness > maxB) maxB = palette[i].brightness;
if (maxB > 0) for (var i = 0; i < palette.length; i++) palette[i].brightness /= maxB;
palette.sort(function(a, b) { return a.brightness - b.brightness; });

var targetCellW = TARGET_ROW_W / COLS;
var spaceW = FONT_SIZE * 0.27;

function findBest(targetB) {
  var lo = 0, hi = palette.length - 1;
  while (lo < hi) {
    var mid = (lo + hi) >> 1;
    if (palette[mid].brightness < targetB) lo = mid + 1;
    else hi = mid;
  }
  var bestScore = Infinity, best = palette[lo];
  var s = Math.max(0, lo - 15), e = Math.min(palette.length, lo + 15);
  for (var i = s; i < e; i++) {
    var p = palette[i];
    var bErr = Math.abs(p.brightness - targetB) * 2.5;
    var wErr = Math.abs(p.width - targetCellW) / targetCellW;
    var score = bErr + wErr;
    if (score < bestScore) { bestScore = score; best = p; }
  }
  return best;
}

// ── Particle system (Somnai attractor style) ──
var particles = [];
for (var i = 0; i < PARTICLE_N; i++) {
  var angle = Math.random() * Math.PI * 2;
  var r = Math.random() * 40 + 20;
  particles.push({
    x: CANVAS_W / 2 + Math.cos(angle) * r,
    y: CANVAS_H / 2 + Math.sin(angle) * r,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8
  });
}

// Simulation canvas
var sCvs = document.createElement("canvas");
sCvs.width = CANVAS_W;
sCvs.height = CANVAS_H;
var sCtx = sCvs.getContext("2d", { willReadFrequently: true });

// Sprite
var spriteCvs = document.createElement("canvas");
var sr = SPRITE_R;
spriteCvs.width = spriteCvs.height = sr * 2;
var sprCtx = spriteCvs.getContext("2d");
var grad = sprCtx.createRadialGradient(sr, sr, 0, sr, sr, sr);
grad.addColorStop(0, "rgba(255,255,255,0.45)");
grad.addColorStop(0.35, "rgba(255,255,255,0.15)");
grad.addColorStop(1, "rgba(255,255,255,0)");
sprCtx.fillStyle = grad;
sprCtx.fillRect(0, 0, sr * 2, sr * 2);

// ── DOM ──
var artBox = document.getElementById("ascii-art");
var artRows = [];
for (var r = 0; r < ROWS; r++) {
  var div = document.createElement("div");
  div.className = "art-row";
  div.style.height = div.style.lineHeight = LINE_HEIGHT + "px";
  artBox.appendChild(div);
  artRows.push(div);
}

// ── Text overlay cycling ──
var TEXTS = ["SMCFactory", "$SMCF", "0x9326314259102CFb0448e3a5022188D56e61CBa3"];
var TEXT_DURATION = 4000;
var FADE_DURATION = 600;
var currentTextIdx = 0;
var lastTextSwitch = 0;
var textOverlay = document.getElementById("text-overlay");

function updateTextOverlay(now) {
  if (now - lastTextSwitch > TEXT_DURATION || lastTextSwitch === 0) {
    if (lastTextSwitch !== 0) currentTextIdx = (currentTextIdx + 1) % TEXTS.length;
    lastTextSwitch = now;
  }

  var elapsed = now - lastTextSwitch;
  var opacity = 1;
  if (elapsed < FADE_DURATION) opacity = elapsed / FADE_DURATION;
  else if (elapsed > TEXT_DURATION - FADE_DURATION) opacity = Math.max(0, (TEXT_DURATION - elapsed) / FADE_DURATION);

  var text = TEXTS[currentTextIdx];
  textOverlay.textContent = text;
  textOverlay.style.opacity = opacity;

  // Adjust font size based on text length
  if (text.length > 30) {
    textOverlay.style.fontSize = "clamp(8px, 1.8vw, 14px)";
    textOverlay.style.wordBreak = "break-all";
    textOverlay.style.maxWidth = "90%";
  } else if (text.length > 10) {
    textOverlay.style.fontSize = "clamp(14px, 3vw, 24px)";
    textOverlay.style.wordBreak = "normal";
    textOverlay.style.maxWidth = "none";
  } else {
    textOverlay.style.fontSize = "clamp(18px, 4vw, 36px)";
    textOverlay.style.wordBreak = "normal";
    textOverlay.style.maxWidth = "none";
  }
}

function esc(c) {
  if (c === "<") return "&lt;";
  if (c === ">") return "&gt;";
  if (c === "&") return "&amp;";
  if (c === '"') return "&quot;";
  return c;
}

function wCls(w, s) {
  var wc = w === 300 ? "w3" : w === 500 ? "w5" : "w8";
  return s === "italic" ? wc + " it" : wc;
}

// ── Main render loop ──
function render(now) {
  // Update text overlay
  updateTextOverlay(now);

  // Particle attractors (orbiting sinusoidally like Somnai)
  var a1x = Math.cos(now * 0.0007) * CANVAS_W * 0.25 + CANVAS_W / 2;
  var a1y = Math.sin(now * 0.0011) * CANVAS_H * 0.3 + CANVAS_H / 2;
  var a2x = Math.cos(now * 0.0013 + Math.PI) * CANVAS_W * 0.2 + CANVAS_W / 2;
  var a2y = Math.sin(now * 0.0009 + Math.PI) * CANVAS_H * 0.25 + CANVAS_H / 2;

  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    var d1x = a1x - p.x, d1y = a1y - p.y;
    var d2x = a2x - p.x, d2y = a2y - p.y;
    var dist1 = d1x * d1x + d1y * d1y;
    var dist2 = d2x * d2x + d2y * d2y;
    var ax = dist1 < dist2 ? d1x : d2x;
    var ay = dist1 < dist2 ? d1y : d2y;
    var dist = Math.sqrt(Math.min(dist1, dist2)) + 1;
    p.vx += ax / dist * 0.12;
    p.vy += ay / dist * 0.12;
    p.vx += (Math.random() - 0.5) * 0.25;
    p.vy += (Math.random() - 0.5) * 0.25;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -sr) p.x += CANVAS_W + sr * 2;
    if (p.x > CANVAS_W + sr) p.x -= CANVAS_W + sr * 2;
    if (p.y < -sr) p.y += CANVAS_H + sr * 2;
    if (p.y > CANVAS_H + sr) p.y -= CANVAS_H + sr * 2;
  }

  // Render particles
  sCtx.fillStyle = "rgba(0,0,0,0.18)";
  sCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  sCtx.globalCompositeOperation = "lighter";
  for (var i = 0; i < particles.length; i++) {
    sCtx.drawImage(spriteCvs, particles[i].x - sr, particles[i].y - sr);
  }
  sCtx.globalCompositeOperation = "source-over";

  // Sample and render ASCII
  var imgData = sCtx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;

  function sample(c, row) {
    var cx = Math.min(CANVAS_W - 1, (c / COLS * CANVAS_W) | 0);
    var cy = Math.min(CANVAS_H - 1, (row / ROWS * CANVAS_H) | 0);
    var idx = (cy * CANVAS_W + cx) * 4;
    return Math.min(1, (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / (3 * 255));
  }

  var rowWidths = [];
  for (var row = 0; row < ROWS; row++) {
    var html = "";
    var tw = 0;
    for (var c = 0; c < COLS; c++) {
      var b = sample(c, row);
      if (b < 0.03) {
        html += " ";
        tw += spaceW;
      } else {
        var m = findBest(b);
        var ai = Math.max(1, Math.min(10, Math.round(b * 10)));
        html += '<span class="' + wCls(m.weight, m.style) + ' a' + ai + '">' + esc(m.char) + '</span>';
        tw += m.width;
      }
    }
    artRows[row].innerHTML = html;
    rowWidths.push(tw);
  }

  // Center rows
  var maxW = 0;
  for (var i = 0; i < rowWidths.length; i++) if (rowWidths[i] > maxW) maxW = rowWidths[i];
  for (var row = 0; row < ROWS; row++) {
    artRows[row].style.paddingLeft = ((maxW - rowWidths[row]) / 2) + "px";
  }

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
