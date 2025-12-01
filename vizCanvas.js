export function drawViz(canvas, state) {
  resize(canvas);
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0,0,w,h);

  // background ground
  ctx.fillStyle = '#0c120f';
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle = '#0f1a14';
  ctx.fillRect(0, h*0.65, w, h*0.35);

  // draw water level hint
  const water = Math.min(1, state.env.water / 100);
  ctx.fillStyle = 'rgba(100,170,150,0.15)';
  ctx.fillRect(0, h*(0.95 - water*0.25), w, h*0.05);

  // plants as tufts/trees
  drawPlants(ctx, w, h, state);
  // animals as simple icons
  drawAnimals(ctx, w, h, state);
  // disaster overlay
  if (state.disaster) {
    ctx.fillStyle = 'rgba(200,80,60,0.08)';
    if (state.disaster.type === 'fire') ctx.fillStyle = 'rgba(255,80,40,0.10)';
    if (state.disaster.type === 'flood') ctx.fillStyle = 'rgba(90,150,200,0.12)';
    if (state.disaster.type === 'drought') ctx.fillStyle = 'rgba(255,210,120,0.08)';
    ctx.fillRect(0,0,w,h);
  }
  // health indicator ring
  const health = state.health / 100;
  const ring = Math.round(health * w);
  ctx.fillStyle = '#243029';
  ctx.fillRect(0,0,w,4);
  ctx.fillStyle = health > 0.7 ? '#58d68d' : (health > 0.3 ? '#e3b341' : '#e05d52');
  ctx.fillRect(0,0,ring,4);
}

function resize(canvas) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawPlants(ctx, w, h, s) {
  const baseY = h * 0.65;
  const grassCount = Math.min(40, Math.round(s.species.grass / 5));
  const shrubCount = Math.min(20, Math.round(s.species.shrub / 5));
  const treeCount = Math.min(10, Math.round(s.species.tree / 3));
  randSeed(s.day);

  ctx.strokeStyle = '#3aa072';
  for (let i=0;i<grassCount;i++){
    const x = rand()*w;
    const len = 6 + rand()*8;
    ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x-2, baseY-len); ctx.stroke();
  }
  ctx.fillStyle = '#4fb885';
  for (let i=0;i<shrubCount;i++){
    const x = rand()*w;
    ctx.beginPath();
    ctx.ellipse(x, baseY-10, 10+rand()*6, 6+rand()*4, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle = '#3a8f6c';
  for (let i=0;i<treeCount;i++){
    const x = rand()*w;
    ctx.fillRect(x-2, baseY-24, 4, 24);
    ctx.beginPath();
    ctx.arc(x, baseY-28, 10+rand()*6, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawAnimals(ctx, w, h, s) {
  const baseY = h * 0.65;
  randSeed(1000 + s.day);
  const drawRabbit = (x,y,col) => {
    ctx.fillStyle = col;
    // body
    ctx.beginPath(); ctx.ellipse(x, y, 6, 4, 0, 0, Math.PI*2); ctx.fill();
    // head
    ctx.beginPath(); ctx.arc(x+7, y-1, 3.5, 0, Math.PI*2); ctx.fill();
    // ears
    ctx.beginPath(); ctx.ellipse(x+8.5, y-7, 1.6, 4, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+6.5, y-7, 1.6, 4, 0.3, 0, Math.PI*2); ctx.fill();
  };
  const drawDeer = (x,y,col) => {
    ctx.fillStyle = col;
    // body
    ctx.fillRect(x-6, y-4, 12, 6);
    // head
    ctx.beginPath(); ctx.arc(x+9, y-6, 4, 0, Math.PI*2); ctx.fill();
    // legs
    ctx.fillRect(x-5, y+2, 2, 6); ctx.fillRect(x+3, y+2, 2, 6);
    // antlers (simple)
    ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x+9, y-9); ctx.lineTo(x+6, y-14); ctx.moveTo(x+9, y-9); ctx.lineTo(x+12, y-13); ctx.stroke();
  };

  const drawFox = (x,y,col) => {
    ctx.fillStyle = col;
    // triangular head + body
    ctx.beginPath(); ctx.moveTo(x+6, y-4); ctx.lineTo(x+12, y); ctx.lineTo(x+6, y+4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x-2, y, 6, 4, 0, 0, Math.PI*2); ctx.fill();
    // tail
    ctx.fillStyle = shade(col, -20); ctx.beginPath(); ctx.ellipse(x-10, y-2, 5, 2.5, -0.8, 0, Math.PI*2); ctx.fill();
  };
  const drawWolf = (x,y,col) => {
    ctx.fillStyle = col;
    // bigger body
    ctx.beginPath(); ctx.ellipse(x, y, 8, 5, 0, 0, Math.PI*2); ctx.fill();
    // head
    ctx.beginPath(); ctx.arc(x+9, y-3, 4.5, 0, Math.PI*2); ctx.fill();
    // ears
    ctx.fillRect(x+7, y-8, 2, 4); ctx.fillRect(x+10, y-8, 2, 4);
    // tail
    ctx.fillStyle = shade(col, -15); ctx.beginPath(); ctx.ellipse(x-10, y-1, 6, 2.6, -0.6, 0, Math.PI*2); ctx.fill();
  };

  const drawIcon = (type, count, color) => {
    const n = Math.min(12, Math.round(count / 3));
    for (let i=0;i<n;i++){
      const x = 10 + rand()*(w-20);
      const y = baseY - 6 - rand()*24;
      if (type==='rabbit') drawRabbit(x,y,color);
      else if (type==='deer') drawDeer(x,y,color);
      else if (type==='fox') drawFox(x,y,color);
      else if (type==='wolf') drawWolf(x,y,color);
    }
  };
  drawIcon('rabbit', s.species.rabbit, '#ffd580');
  drawIcon('deer', s.species.deer, '#ffb870');
  drawIcon('fox', s.species.fox, '#ff8a70');
  drawIcon('wolf', s.species.wolf, '#b3c2ff');
}

let _seed = 1;
function randSeed(v){ _seed = v || 1; }
function rand(){ _seed ^= _seed << 13; _seed ^= _seed >>> 17; _seed ^= _seed << 5; return Math.abs(_seed % 1000) / 1000; }

function shade(hex, percent) {
  // simple hex shade helper: percent negative darkens
  const c = hex.replace('#','');
  const num = parseInt(c,16);
  let r = (num >> 16) + percent, g = ((num >> 8) & 0x00FF) + percent, b = (num & 0x0000FF) + percent;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + ( (1<<24) + (r<<16) + (g<<8) + b ).toString(16).slice(1);
}