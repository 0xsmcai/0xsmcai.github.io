// factory-splash.js — Pretext-powered ASCII art splash for SMC Factory
// Renders cycling text ("SMCFactory", "$SMCF", contract address) as particle-driven ASCII art
import { prepareWithSegments } from "./pretext.js";

// ── Config ──
var COLS = 70;
var ROWS = 32;
var FONT_SIZE = 13;
var LINE_HEIGHT = 15;
var TARGET_ROW_W = 560;
var PROP_FAMILY = 'Georgia, Palatino, "Times New Roman", serif';
var CANVAS_W = 280;
var CANVAS_H = 128;
var PARTICLE_N = 180;
var SPRITE_R = 10;
var CHARSET = " .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$";
var WEIGHTS = [300, 500, 800];
var STYLES = ["normal", "italic"];

// Text to cycle through
var TEXTS = [
  "SMCFactory",
  "$SMCF",
  "0x9326314259102CFb0448e3a5022188D56e61CBa3"
];
var TEXT_DURATION = 4000; // ms per text
var FADE_DURATION = 800;  // ms fade between texts

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

// ── Text rendering canvas (renders the cycling text as bitmap for particles to follow) ──
var textCvs = document.createElement("canvas");
textCvs.width = CANVAS_W;
textCvs.height = CANVAS_H;
var textCtx = textCvs.getContext("2d", { willReadFrequently: true });

function renderTextBitmap(text) {
  textCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  textCtx.fillStyle = "#000";
  textCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Auto-size font to fit width
  var fontSize = 48;
  if (text.length > 20) fontSize = 16;
  else if (text.length > 10) fontSize = 28;

  textCtx.font = "bold " + fontSize + "px 'Press Start 2P', monospace";
  textCtx.fillStyle = "#fff";
  textCtx.textAlign = "center";
  textCtx.textBaseline = "middle";

  // For long text (contract address), wrap it
  if (text.length > 30) {
    var mid = Math.ceil(text.length / 2);
    // Find a good break point near middle
    var breakAt = mid;
    textCtx.font = "bold 14px 'Press Start 2P', monospace";
    textCtx.fillText(text.slice(0, breakAt), CANVAS_W / 2, CANVAS_H / 2 - 12);
    textCtx.fillText(text.slice(breakAt), CANVAS_W / 2, CANVAS_H / 2 + 12);
  } else {
    textCtx.fillText(text, CANVAS_W / 2, CANVAS_H / 2);
  }

  return textCtx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
}

// ── Particle system — particles are attracted to bright areas of the text bitmap ──
var particles = [];
for (var i = 0; i < PARTICLE_N; i++) {
  var angle = Math.random() * Math.PI * 2;
  var r = Math.random() * 60 + 20;
  particles.push({
    x: CANVAS_W / 2 + Math.cos(angle) * r,
    y: CANVAS_H / 2 + Math.sin(angle) * r,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    tx: CANVAS_W / 2, // target x
    ty: CANVAS_H / 2  // target y
  });
}

// ── Simulation canvas (particle trails) ──
var sCvs = document.createElement("canvas");
sCvs.width = CANVAS_W;
sCvs.height = CANVAS_H;
var sCtx = sCvs.getContext("2d", { willReadFrequently: true });

// Sprite for soft glow particles
var spriteCvs = document.createElement("canvas");
var sr = SPRITE_R;
spriteCvs.width = spriteCvs.height = sr * 2;
var sprCtx = spriteCvs.getContext("2d");
var grad = sprCtx.createRadialGradient(sr, sr, 0, sr, sr, sr);
grad.addColorStop(0, "rgba(255,255,255,0.5)");
grad.addColorStop(0.3, "rgba(255,255,255,0.2)");
grad.addColorStop(1, "rgba(255,255,255,0)");
sprCtx.fillStyle = grad;
sprCtx.fillRect(0, 0, sr * 2, sr * 2);

// ── DOM rows ──
var artBox = document.getElementById("ascii-art");
var artRows = [];
for (var r = 0; r < ROWS; r++) {
  var div = document.createElement("div");
  div.className = "art-row";
  div.style.height = div.style.lineHeight = LINE_HEIGHT + "px";
  artBox.appendChild(div);
  artRows.push(div);
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

// ── Find target positions from text bitmap ──
function updateTargets(textData) {
  // Collect bright pixels
  var brightPixels = [];
  for (var y = 0; y < CANVAS_H; y += 2) {
    for (var x = 0; x < CANVAS_W; x += 2) {
      var idx = (y * CANVAS_W + x) * 4;
      var b = (textData[idx] + textData[idx + 1] + textData[idx + 2]) / (3 * 255);
      if (b > 0.3) brightPixels.push({ x: x, y: y, b: b });
    }
  }

  // Assign each particle a target on the text
  for (var i = 0; i < particles.length; i++) {
    if (brightPixels.length > 0) {
      var target = brightPixels[Math.floor(Math.random() * brightPixels.length)];
      particles[i].tx = target.x + (Math.random() - 0.5) * 4;
      particles[i].ty = target.y + (Math.random() - 0.5) * 4;
    } else {
      particles[i].tx = CANVAS_W / 2 + (Math.random() - 0.5) * 80;
      particles[i].ty = CANVAS_H / 2 + (Math.random() - 0.5) * 40;
    }
  }
}

// ── Text cycling state ──
var currentTextIdx = 0;
var lastTextSwitch = 0;
var currentTextData = null;

function getCurrentTextOpacity(now) {
  var elapsed = now - lastTextSwitch;
  if (elapsed < FADE_DURATION) return elapsed / FADE_DURATION;
  if (elapsed > TEXT_DURATION - FADE_DURATION) return Math.max(0, (TEXT_DURATION - elapsed) / FADE_DURATION);
  return 1;
}

// ── Main render loop ──
function render(now) {
  // Text cycling
  if (now - lastTextSwitch > TEXT_DURATION || lastTextSwitch === 0) {
    if (lastTextSwitch !== 0) currentTextIdx = (currentTextIdx + 1) % TEXTS.length;
    lastTextSwitch = now;
    currentTextData = renderTextBitmap(TEXTS[currentTextIdx]);
    updateTargets(currentTextData);
  }

  var textOpacity = getCurrentTextOpacity(now);

  // Update particles — attract to text targets with some wandering
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    var dx = p.tx - p.x;
    var dy = p.ty - p.y;
    var dist = Math.sqrt(dx * dx + dy * dy) + 1;

    // Attract to target
    p.vx += dx / dist * 0.15;
    p.vy += dy / dist * 0.15;

    // Add some organic wandering
    p.vx += (Math.random() - 0.5) * 0.3;
    p.vy += (Math.random() - 0.5) * 0.3;

    // Damping
    p.vx *= 0.94;
    p.vy *= 0.94;

    p.x += p.vx;
    p.y += p.vy;

    // Wrap
    if (p.x < -sr) p.x += CANVAS_W + sr * 2;
    if (p.x > CANVAS_W + sr) p.x -= CANVAS_W + sr * 2;
    if (p.y < -sr) p.y += CANVAS_H + sr * 2;
    if (p.y > CANVAS_H + sr) p.y -= CANVAS_H + sr * 2;
  }

  // Render particles to simulation canvas
  sCtx.fillStyle = "rgba(0,0,0,0.2)";
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
    return Math.min(1, (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / (3 * 255)) * textOpacity;
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
