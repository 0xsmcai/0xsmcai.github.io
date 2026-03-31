// factory-splash.js — Pretext ASCII art that renders cycling text
// Text is rendered to a hidden canvas, sampled per-cell for brightness,
// then mapped to proportional characters via pretext width measurement.
import { prepareWithSegments } from "./pretext.js";

// ── Config ──
var COLS = 70;
var ROWS = 20;
var FONT_SIZE = 13;
var LINE_HEIGHT = 16;
var TARGET_ROW_W = 560;
var PROP_FAMILY = 'Georgia, Palatino, "Times New Roman", serif';
var CHARSET = " .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$";
var WEIGHTS = [300, 500, 800];
var STYLES = ["normal", "italic"];

// Text to cycle through
var TEXTS = ["SMCFactory", "$SMCF", "0x9326314259102CFb0448e3a5022188D56e61CBa3"];
var TEXT_DURATION = 3500;
var FADE_DURATION = 500;

// Hidden text canvas — large enough for crisp text rendering
var TEXT_W = 700;
var TEXT_H = 200;
var textCvs = document.createElement("canvas");
textCvs.width = TEXT_W;
textCvs.height = TEXT_H;
var textCtx = textCvs.getContext("2d", { willReadFrequently: true });

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

// ── Render text to hidden canvas ──
function renderTextBitmap(text) {
  textCtx.clearRect(0, 0, TEXT_W, TEXT_H);
  textCtx.fillStyle = "#000";
  textCtx.fillRect(0, 0, TEXT_W, TEXT_H);

  // Auto-size: find the largest font that fits
  var fontSize = 120;
  textCtx.textAlign = "center";
  textCtx.textBaseline = "middle";

  if (text.length > 30) {
    // Contract address — two lines
    var half1 = text.slice(0, 21);
    var half2 = text.slice(21);
    fontSize = 32;
    textCtx.font = "bold " + fontSize + "px Impact, Arial Black, sans-serif";
    // Shrink if too wide
    while (textCtx.measureText(half1).width > TEXT_W * 0.9 && fontSize > 12) {
      fontSize--;
      textCtx.font = "bold " + fontSize + "px Impact, Arial Black, sans-serif";
    }
    textCtx.fillStyle = "#fff";
    textCtx.fillText(half1, TEXT_W / 2, TEXT_H / 2 - fontSize * 0.6);
    textCtx.fillText(half2, TEXT_W / 2, TEXT_H / 2 + fontSize * 0.6);
  } else {
    textCtx.font = "bold " + fontSize + "px Impact, Arial Black, sans-serif";
    // Shrink if too wide
    while (textCtx.measureText(text).width > TEXT_W * 0.85 && fontSize > 20) {
      fontSize -= 2;
      textCtx.font = "bold " + fontSize + "px Impact, Arial Black, sans-serif";
    }
    textCtx.fillStyle = "#fff";
    textCtx.fillText(text, TEXT_W / 2, TEXT_H / 2);
  }

  return textCtx.getImageData(0, 0, TEXT_W, TEXT_H).data;
}

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

// ── State ──
var currentTextIdx = 0;
var lastTextSwitch = 0;
var currentBitmap = null;
var shimmerOffset = 0;

// ── Sampling with shimmer effect ──
function sampleBitmap(bitmap, c, row, shimmer) {
  var cx = Math.min(TEXT_W - 1, (c / COLS * TEXT_W) | 0);
  var cy = Math.min(TEXT_H - 1, (row / ROWS * TEXT_H) | 0);
  var idx = (cy * TEXT_W + cx) * 4;
  var base = (bitmap[idx] + bitmap[idx + 1] + bitmap[idx + 2]) / (3 * 255);
  // Add shimmer wave
  if (base > 0.05) {
    var wave = Math.sin((c * 0.3) + (row * 0.2) + shimmer) * 0.15 + 0.85;
    base *= wave;
  }
  return Math.max(0, Math.min(1, base));
}

// ── Render loop ──
function render(now) {
  // Text cycling
  if (now - lastTextSwitch > TEXT_DURATION || lastTextSwitch === 0) {
    if (lastTextSwitch !== 0) currentTextIdx = (currentTextIdx + 1) % TEXTS.length;
    lastTextSwitch = now;
    currentBitmap = renderTextBitmap(TEXTS[currentTextIdx]);
  }

  // Fade in/out
  var elapsed = now - lastTextSwitch;
  var opacity = 1;
  if (elapsed < FADE_DURATION) opacity = elapsed / FADE_DURATION;
  else if (elapsed > TEXT_DURATION - FADE_DURATION) opacity = Math.max(0, (TEXT_DURATION - elapsed) / FADE_DURATION);

  shimmerOffset = now * 0.003;

  // Render ASCII from text bitmap
  var rowWidths = [];
  for (var row = 0; row < ROWS; row++) {
    var html = "";
    var tw = 0;
    for (var c = 0; c < COLS; c++) {
      var b = sampleBitmap(currentBitmap, c, row, shimmerOffset) * opacity;
      if (b < 0.04) {
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
