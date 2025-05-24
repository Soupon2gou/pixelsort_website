// pixelsort-site/js/pixelsort.js
const fileInput  = document.getElementById('fileInput');
const angleInput = document.getElementById('angleInput');
const angleVal   = document.getElementById('angleVal');
const undoBtn    = document.getElementById('undoBtn');
const resetBtn   = document.getElementById('resetBtn');
const saveBtn    = document.getElementById('saveBtn');
const canvas     = document.getElementById('canvas');
const ctx        = canvas.getContext('2d');

let historyStack = [];
let originalImage = null;

/* ---------- Utility ---------- */
const deg2rad = deg => deg * Math.PI / 180;
const brightness = (r, g, b) => r * 0.299 + g * 0.587 + b * 0.114;

function pushHistory() {
  historyStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (historyStack.length > 20) historyStack.shift(); // keep last 20 actions
}

function restoreHistory() {
  if (!historyStack.length) return;
  ctx.putImageData(historyStack.pop(), 0, 0);
}

/* ---------- Core: Pixel-sort along a ray ---------- */
function pixelSortRay(x0, y0, angleDeg) {
  const { width: w, height: h } = canvas;
  const theta = deg2rad(angleDeg);
  const dx = Math.cos(theta);
  const dy = Math.sin(theta);

  // Step 1: collect all (x, y) along the ray
  const coords = [];
  let x = x0, y = y0;
  while (x >= 0 && x < w && y >= 0 && y < h) {
    coords.push([Math.round(x), Math.round(y)]);
    x += dx;
    y += dy;
  }

  // Step 2: grab pixel data
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const pixels = coords.map(([cx, cy]) => {
    const idx = (cy * w + cx) * 4;
    return { idx, r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
  });

  // Step 3: sort by brightness & write back
  pixels.sort((a, b) => brightness(a.r, a.g, a.b) - brightness(b.r, b.g, b.b));

  pixels.forEach((p, i) => {
    const { idx } = p;
    const s = pixels[i];
    data[idx]     = s.r;
    data[idx + 1] = s.g;
    data[idx + 2] = s.b;
    data[idx + 3] = s.a;
  });

  ctx.putImageData(imgData, 0, 0);
}

/* ---------- UI bindings ---------- */
angleInput.addEventListener('input', () => {
  angleVal.textContent = angleInput.value;
});

canvas.addEventListener('click', e => {
  if (!canvas.width) return; // no image loaded yet
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  pushHistory();
  pixelSortRay(x, y, parseInt(angleInput.value));
});

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    canvas.width  = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyStack = [];
  };
  img.src = URL.createObjectURL(file);
});

undoBtn.addEventListener('click', restoreHistory);

resetBtn.addEventListener('click', () => {
  if (originalImage) {
    ctx.putImageData(originalImage, 0, 0);
    historyStack = [];
  }
});

saveBtn.addEventListener('click', () => {
  if (!canvas.width) return;
  const link = document.createElement('a');
  link.download = 'pixelsorted.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
