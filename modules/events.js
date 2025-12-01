export function createEvents(state) {
  function rng() { return Math.random(); }

  function applyClimateDrift() {
    // ±0.1°C daily drift
    state.env.temp = Math.max(-10, Math.min(40, state.env.temp + (rng() < 0.5 ? -0.1 : 0.1)));
  }

  function rollDaily() {
    // catastrophes 5%
    if (!state.disaster && chance(0.05)) {
      const kinds = ['drought','flood','fire'];
      trigger({ type: pick(kinds), days: rndInt(2,4) });
    }
    // invasive 3%
    if (!state.disaster && chance(0.03)) {
      trigger({ type: 'invasive', days: rndInt(3,5) });
    }
    // disease 4% when high density
    const density = (state.species.rabbit + state.species.deer + state.species.fox + state.species.wolf);
    if (!state.disaster && density > 60 && chance(0.04)) {
      const pool = ['rabbit','deer','fox','wolf'];
      trigger({ type: 'disease', target: pick(pool), days: rndInt(2,3) });
    }
  }

  function trigger(dis) {
    state.disaster = dis;
    notify(dis);
  }

  function notify(dis) {
    const send = (msg, level) => {
      const el = document.createElement('div');
      el.className = `toast ${level}`;
      el.textContent = msg;
      document.getElementById('toasts').appendChild(el);
      setTimeout(() => el.remove(), 5000);
    };
    const map = {
      drought: 'Засуха: влажность и вода снижаются.',
      flood: 'Наводнение: страдают животные и почва.',
      fire: 'Пожар: растения выгорают.',
      invasive: 'Инвазивные виды вытесняют растения.',
      disease: `Эпидемия поражает вид: ${state.disaster.target}.`,
    };
    send(map[state.disaster.type] || 'Событие', 'danger');
  }

  function chance(p) { return Math.random() < p; }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function rndInt(a,b){ return a + ((Math.random() * (b - a + 1)) | 0); }

  function mitigate() {
    if (!state.disaster) return;
    // reduce duration and soften impact
    state.disaster.days = Math.max(0, state.disaster.days - 2);
  }

  return { rollDaily, applyClimateDrift, mitigate };
}
