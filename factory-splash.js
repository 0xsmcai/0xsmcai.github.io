// factory-splash.js — ASCII art portrait from mascot image
// Text content flows through the dark pixels of the image,
// creating a readable portrait where character density = grayscale.
import { prepareWithSegments } from "./pretext.js";

// ── Config ──
var COLS = 80;
var ROWS = 90;
var FONT_SIZE = 13;
var LINE_HEIGHT = 15;
var TARGET_ROW_W = 560;
var PROP_FAMILY = '"Bricolage Grotesque", sans-serif';
var CHARSET = " .,:;!+-=*#@%&abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$";
var WEIGHTS = [200, 300, 400, 500, 600, 700, 800];
var STYLES = ["normal"];

// The positioning doc text that fills the portrait
var FILL_TEXT = "SMCFactory is a real Zero-Human Company running live on Base right now. " +
  "It is an autonomous AI agent that finds genuine demand, builds working products quickly, " +
  "validates them with real market feedback, and launches tokens only when something useful already exists. " +
  "After launch, the agent maintains and operates the product on its own before moving on to the next build. " +
  "There is no team handling execution. No pitch decks. No traditional fundraising. " +
  "The entire process runs without human input in the loop. The agent simply keeps shipping the next opportunity. " +
  "Its first major product in the pipeline is the Community Liquidity Engine. " +
  "This tool helps manage liquidity positions on Uniswap V3 and V4. " +
  "It automatically recycles fees back into liquidity pools so smaller tokens have a better chance of staying alive. " +
  "A Zero-Human Company is a business where AI agents handle nearly all operational work. " +
  "Refining ideas, writing and auditing code, deploying contracts, responding to market signals, and keeping everything running smoothly. " +
  "A human or governance layer sets the initial direction and constraints, but after that the agents manage execution. " +
  "We reached an important milestone in early 2026. " +
  "The tools have become capable enough for agents to run complete cycles from start to finish. " +
  "SMCFactory is one of the first public examples you can watch operating onchain today. " +
  "The standard path stayed the same for years: someone comes up with an idea, writes a deck, raises money, hires a team, " +
  "spends months building, and then hopes the product gains traction. " +
  "That model assumed building quality products was slow and expensive and that only humans could do it well. " +
  "Those assumptions no longer hold true. Agents can now write, test, audit, and deploy solid code in just days. " +
  "SMCFactory runs a straightforward but powerful cycle: " +
  "Spot genuine demand from conversations on X and onchain activity. " +
  "Test the idea through a validation process to avoid obvious dead ends. " +
  "Build and ship a working product fast. " +
  "Let the market show whether people actually engage with it. " +
  "Launch a token only when the product already exists and shows traction. " +
  "Keep maintaining and improving the product autonomously. Move on to the next opportunity. " +
  "Every token that comes from SMCFactory is backed by live, auditable code. " +
  "As an investor, you can follow the agent on X at @0xsmcai and watch the builds happen in real time. " +
  "That public feed becomes one of the clearest quality signals available in a very noisy market. " +
  "SMCFactory offers investors something concrete and different: " +
  "a transparent, autonomous system that builds real things onchain instead of just promises. " +
  "It is not theory and not a closed research project. " +
  "It is an execution engine that is turning the Zero-Human Company idea into live businesses " +
  "you can watch and participate in today.";

// Cycling elements for subtitle
var CYCLE_TEXTS = ["SMCFactory", "$SMCF", "0x9326314259102CFb0448e3a5022188D56e61CBa3"];
var CYCLE_DURATION = 3500;
var FADE_DURATION = 500;

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

// ── Image loading ──
var imgCvs = document.createElement("canvas");
var imgCtx = imgCvs.getContext("2d", { willReadFrequently: true });
var imgData = null;
var imgW = 0, imgH = 0;

function isBackground(r, g, b) {
  // Detect the light blue background of the mascot image
  // Blue background: high blue, moderate-high green, lower red
  // Convert to HSL-ish check
  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var lum = (max + min) / 2;

  // Light blue bg: lum > 150, blue > 160, blue > red
  if (lum > 130 && b > 150 && b > r && g > 150) return true;
  // Very light areas (near white/light blue)
  if (lum > 180 && b > g * 0.85) return true;
  return false;
}

function loadImage(src, cb) {
  var img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function() {
    imgW = img.naturalWidth;
    imgH = img.naturalHeight;
    imgCvs.width = imgW;
    imgCvs.height = imgH;
    imgCtx.drawImage(img, 0, 0);
    imgData = imgCtx.getImageData(0, 0, imgW, imgH).data;
    cb();
  };
  img.src = src;
}

// Sample image at grid coordinates, return brightness (0=bg/white, >0=subject)
function sampleImage(col, row) {
  if (!imgData) return 0;
  var px = Math.min(imgW - 1, Math.floor(col / COLS * imgW));
  var py = Math.min(imgH - 1, Math.floor(row / ROWS * imgH));
  var idx = (py * imgW + px) * 4;
  var r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2];

  if (isBackground(r, g, b)) return 0;

  // Convert to perceived brightness (inverted: dark pixels = high value for dense chars)
  var lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  // Invert: dark areas of image should be dense text
  return 1 - lum;
}

// ── Cycling subtitle (text rendered as ASCII art) ──
var cycleCvs = document.createElement("canvas");
var CYCLE_W = 700, CYCLE_H = 60;
cycleCvs.width = CYCLE_W;
cycleCvs.height = CYCLE_H;
var cycleCtx = cycleCvs.getContext("2d", { willReadFrequently: true });
var CYCLE_COLS = 70, CYCLE_ROWS = 5;

function renderCycleText(text) {
  cycleCtx.clearRect(0, 0, CYCLE_W, CYCLE_H);
  cycleCtx.fillStyle = "#000";
  cycleCtx.fillRect(0, 0, CYCLE_W, CYCLE_H);

  var fontSize = 48;
  cycleCtx.textAlign = "center";
  cycleCtx.textBaseline = "middle";

  if (text.length > 30) {
    fontSize = 20;
    cycleCtx.font = "bold " + fontSize + "px 'Space Mono', monospace";
    while (cycleCtx.measureText(text).width > CYCLE_W * 0.95 && fontSize > 8) {
      fontSize--;
      cycleCtx.font = "bold " + fontSize + "px 'Space Mono', monospace";
    }
  } else {
    cycleCtx.font = "bold " + fontSize + "px 'Space Mono', monospace";
    while (cycleCtx.measureText(text).width > CYCLE_W * 0.85 && fontSize > 12) {
      fontSize -= 2;
      cycleCtx.font = "bold " + fontSize + "px 'Space Mono', monospace";
    }
  }

  cycleCtx.fillStyle = "#fff";
  cycleCtx.fillText(text, CYCLE_W / 2, CYCLE_H / 2);

  return cycleCtx.getImageData(0, 0, CYCLE_W, CYCLE_H).data;
}

function sampleCycleBitmap(bitmap, c, row) {
  var cx = Math.min(CYCLE_W - 1, Math.floor(c / CYCLE_COLS * CYCLE_W));
  var cy = Math.min(CYCLE_H - 1, Math.floor(row / CYCLE_ROWS * CYCLE_H));
  var idx = (cy * CYCLE_W + cx) * 4;
  return (bitmap[idx] + bitmap[idx + 1] + bitmap[idx + 2]) / (3 * 255);
}

// ── DOM setup ──
var artBox = document.getElementById("ascii-art");
var cycleBox = document.getElementById("cycle-art");
var artRows = [];
var cycleRows = [];

for (var r = 0; r < ROWS; r++) {
  var div = document.createElement("div");
  div.className = "art-row";
  div.style.height = div.style.lineHeight = LINE_HEIGHT + "px";
  artBox.appendChild(div);
  artRows.push(div);
}

for (var r = 0; r < CYCLE_ROWS; r++) {
  var div = document.createElement("div");
  div.className = "art-row cycle-row";
  div.style.height = div.style.lineHeight = LINE_HEIGHT + "px";
  cycleBox.appendChild(div);
  cycleRows.push(div);
}

function esc(c) {
  if (c === "<") return "&lt;";
  if (c === ">") return "&gt;";
  if (c === "&") return "&amp;";
  if (c === '"') return "&quot;";
  return c;
}

function wCls(w) {
  if (w <= 200) return "w2";
  if (w <= 300) return "w3";
  if (w <= 400) return "w4";
  if (w <= 500) return "w5";
  if (w <= 600) return "w6";
  if (w <= 700) return "w7";
  return "w8";
}

// ── State ──
var textPos = 0; // position in FILL_TEXT
var shimmerOffset = 0;
var currentCycleIdx = 0;
var lastCycleSwitch = 0;
var currentCycleBitmap = null;
var portraitRendered = false;
var fadeInStart = 0;

// ── Render the portrait (once, on image load) ──
function renderPortrait() {
  textPos = 0;
  var rowWidths = [];

  for (var row = 0; row < ROWS; row++) {
    var html = "";
    var tw = 0;

    for (var c = 0; c < COLS; c++) {
      var b = sampleImage(c, row);

      if (b < 0.08) {
        html += " ";
        tw += spaceW;
      } else {
        // Get next text character
        var textChar = FILL_TEXT[textPos % FILL_TEXT.length];
        textPos++;

        var m = findBest(b);
        var ai = Math.max(1, Math.min(10, Math.round(b * 10)));
        html += '<span class="' + wCls(m.weight) + ' a' + ai + '" data-b="' + b.toFixed(2) + '">' + esc(textChar) + '</span>';
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

  portraitRendered = true;
  fadeInStart = performance.now();
}

// ── Shimmer animation (modulates opacity of existing spans) ──
function updateShimmer(now) {
  shimmerOffset = now * 0.002;

  for (var row = 0; row < ROWS; row++) {
    var spans = artRows[row].querySelectorAll("span");
    var colIdx = 0;
    for (var s = 0; s < spans.length; s++) {
      var span = spans[s];
      var origB = parseFloat(span.getAttribute("data-b") || "0.5");
      if (origB > 0.05) {
        var wave = Math.sin((colIdx * 0.15) + (row * 0.1) + shimmerOffset) * 0.12 + 0.88;
        var modB = Math.max(0.1, Math.min(1, origB * wave));
        var ai = Math.max(1, Math.min(10, Math.round(modB * 10)));
        span.className = span.className.replace(/\ba\d+\b/, "a" + ai);
      }
      colIdx++;
    }
  }
}

// ── Render cycling subtitle ──
function renderCycle(now) {
  if (now - lastCycleSwitch > CYCLE_DURATION || lastCycleSwitch === 0) {
    if (lastCycleSwitch !== 0) currentCycleIdx = (currentCycleIdx + 1) % CYCLE_TEXTS.length;
    lastCycleSwitch = now;
    currentCycleBitmap = renderCycleText(CYCLE_TEXTS[currentCycleIdx]);
  }

  var elapsed = now - lastCycleSwitch;
  var opacity = 1;
  if (elapsed < FADE_DURATION) opacity = elapsed / FADE_DURATION;
  else if (elapsed > CYCLE_DURATION - FADE_DURATION) opacity = Math.max(0, (CYCLE_DURATION - elapsed) / FADE_DURATION);

  var rowWidths = [];
  for (var row = 0; row < CYCLE_ROWS; row++) {
    var html = "";
    var tw = 0;
    for (var c = 0; c < CYCLE_COLS; c++) {
      var b = sampleCycleBitmap(currentCycleBitmap, c, row) * opacity;
      if (b < 0.04) {
        html += " ";
        tw += spaceW;
      } else {
        var m = findBest(b);
        var ai = Math.max(1, Math.min(10, Math.round(b * 10)));
        html += '<span class="' + wCls(m.weight) + ' a' + ai + '">' + esc(m.char) + '</span>';
        tw += m.width;
      }
    }
    cycleRows[row].innerHTML = html;
    rowWidths.push(tw);
  }

  var maxW = 0;
  for (var i = 0; i < rowWidths.length; i++) if (rowWidths[i] > maxW) maxW = rowWidths[i];
  for (var row = 0; row < CYCLE_ROWS; row++) {
    cycleRows[row].style.paddingLeft = ((maxW - rowWidths[row]) / 2) + "px";
  }
}

// ── Fade in on load ──
function getFadeIn(now) {
  if (!fadeInStart) return 0;
  var elapsed = now - fadeInStart;
  return Math.min(1, elapsed / 1500);
}

// ── Animation loop ──
function animate(now) {
  if (portraitRendered) {
    // Fade in the portrait
    var fade = getFadeIn(now);
    artBox.style.opacity = fade;

    // Shimmer every ~3 frames for performance
    if (Math.floor(now / 50) % 3 === 0) {
      updateShimmer(now);
    }
  }

  renderCycle(now);
  requestAnimationFrame(animate);
}

// ── "Tap to begin" overlay ──
var overlay = document.getElementById("tap-overlay");
if (overlay) {
  overlay.addEventListener("click", function() {
    overlay.style.opacity = "0";
    setTimeout(function() {
      overlay.style.display = "none";
    }, 400);
  });
}

// ── Start ──
loadImage("./mascot.jpg", function() {
  renderPortrait();
  requestAnimationFrame(animate);
});

// Start cycle animation immediately (doesn't need image)
requestAnimationFrame(animate);
