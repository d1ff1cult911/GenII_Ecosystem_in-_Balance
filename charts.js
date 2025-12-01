export function Charts(popCanvas, envCanvas, state) {
  function pushDay(init=false) {
    if (init) return;
    // already pushed in ecosystem; noop here
  }

  function render() {
    renderPop();
    renderEnv();
  }

  function renderPop() {
    const ctx = prep(popCanvas);
    const w = popCanvas.clientWidth, h = popCanvas.clientHeight;
    drawGrid(ctx, w, h);
    const series = [
      { key: 'grass', col: '#58d68d' },
      { key: 'shrub', col: '#8bd6a5' },
      { key: 'tree', col: '#43b37b' },
      { key: 'rabbit', col: '#ffd580' },
      { key: 'deer', col: '#ffb870' },
      { key: 'fox', col: '#ff8a70' },
      { key: 'wolf', col: '#b3c2ff' },
    ];
    const data = state.history.pops;
    const max = Math.max(1, ...data.flatMap(d => series.map(s => d[s.key] || 0)));
    series.forEach(s => drawLine(ctx, data.map(d=>d[s.key]||0), max, s.col, w, h));
  }

  function renderEnv() {
    const ctx = prep(envCanvas);
    const w = envCanvas.clientWidth, h = envCanvas.clientHeight;
    drawGrid(ctx, w, h);
    const data = state.history.env;
    const series = [
      { key: 'temp', col: '#ffb870', scale: 40, min: -10, max: 40 },
      { key: 'hum', col: '#8bd6a5', scale: 100, min: 0, max: 100 },
      { key: 'o2', col: '#b3c2ff', scale: 300, min: 0, max: 300 },
      { key: 'health', col: '#58d68d', scale: 100, min: 0, max: 100 },
    ];
    const maxLen = Math.max(1, data.length);
    series.forEach(s => {
      const vals = data.map(d=>normalize(d[s.key], s.min, s.max));
      drawLine(ctx, vals, 1, s.col, w, h);
    });
  }

  function normalize(v, min, max){ return (v - min) / (max - min); }

  function prep(canvas) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0,0,rect.width, rect.height);
    return ctx;
  }

  function drawGrid(ctx, w, h) {
    ctx.strokeStyle = '#213126';
    ctx.lineWidth = 1;
    for (let i=0;i<4;i++){
      const y = (h/4)*i + 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  function drawLine(ctx, arr, max, color, w, h) {
    if (!arr.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    arr.forEach((v, i) => {
      const x = i/(arr.length-1||1) * (w-8) + 4;
      const y = h - (Math.min(1, v/max)) * (h-8) - 4;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }

  return { pushDay, render };
}