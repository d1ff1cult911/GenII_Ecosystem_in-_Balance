import { drawViz } from './vizCanvas.js';

export function makeUI(state, handlers) {
  const el = {
    day: document.getElementById('day'),
    health: document.getElementById('health'),
    tempVal: document.getElementById('tempVal'),
    humVal: document.getElementById('humVal'),
    o2Val: document.getElementById('o2Val'),
    soilVal: document.getElementById('soilVal'),
    waterVal: document.getElementById('waterVal'),
    ap: document.getElementById('apVal'),
    budget: document.getElementById('budgetVal'),
    pauseBtn: document.getElementById('pauseBtn'),
    speedUp: document.getElementById('speedUpBtn'),
    speedDown: document.getElementById('speedDownBtn'),
    speedLabel: document.getElementById('speedLabel'),
    settingsBtn: document.getElementById('settingsBtn'),
    threatsBtn: document.getElementById('threatsBtn'),
    infoBtn: document.getElementById('infoBtn'),
    healthBtn: document.getElementById('healthBtn'),
    mitigateBtn: document.getElementById('mitigateBtn'),
    popBar: document.getElementById('popBar'),
    canvas: document.getElementById('vizCanvas'),
    toasts: document.getElementById('toasts'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.getElementById('modalClose'),
  };

  // buttons
  document.querySelector('[data-act="temp-"]').onclick = () => handlers.onAdjustTemp(-1);
  document.querySelector('[data-act="temp+"]').onclick = () => handlers.onAdjustTemp(1);
  document.querySelector('[data-act="hum-"]').onclick = () => handlers.onAdjustHum(-1);
  document.querySelector('[data-act="hum+"]').onclick = () => handlers.onAdjustHum(1);
  document.querySelectorAll('.action[data-add]').forEach(b => {
    b.onclick = () => handlers.onAdd(b.getAttribute('data-add'));
  });
  el.mitigateBtn.onclick = () => handlers.onMitigate();
  el.pauseBtn.onclick = () => handlers.onPause();
  el.speedUp.onclick = () => handlers.onSpeedUp();
  el.speedDown.onclick = () => handlers.onSpeedDown();
  el.settingsBtn.onclick = () => handlers.onOpenSettings();
  el.threatsBtn && (el.threatsBtn.onclick = () => handlers.onOpenThreats && handlers.onOpenThreats());
  el.infoBtn.onclick = () => handlers.onOpenInfo();
  el.healthBtn && (el.healthBtn.onclick = () => handlers.onOpenHealth && handlers.onOpenHealth());
  el.modalClose.onclick = () => hideModal();

  // TUTORIAL
  function tutorial() {
    const steps = [
      { q: 'Привет! Я проведу вас по основам управления.', btn: 'Далее' },
      { q: 'Изменяйте температуру здесь — небольшие шаги влияют на растения и животных.', target: document.querySelector('[data-act="temp-"]').parentElement },
      { q: 'Влажность важна для роста растений и уровня воды.', target: document.querySelector('[data-act="hum-"]').parentElement },
      { q: 'Добавляйте виды справа, чтобы разнообразить экосистему.', target: document.querySelector('.actions') },
      { q: 'Наблюдайте за индикаторами внизу: популяции и среда.', target: document.querySelector('.charts') },
      { q: 'Используйте кнопку "Устранить угрозу" для смягчения бедствий (если они появятся).', target: el.mitigateBtn },
      { q: 'Удачные решения приносят бюджет — поддерживайте здоровье экосистемы и биоразнообразие, чтобы получать деньги для действий.', btn: 'Далее' },
      { q: 'Удачи! Попробуйте добавить несколько растений и зайцев. Сбалансированная экосистема повышает здоровье и приносит больше бюджета.', btn: 'Готово' },
    ];
    let idx = 0;
    const overlay = document.createElement('div'); overlay.className = 'tutorial-overlay';
    const card = document.createElement('div'); card.className = 'tutorial-card';
    const highlight = document.createElement('div'); highlight.className = 'tutorial-highlight';
    overlay.appendChild(highlight);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function renderStep() {
      const step = steps[idx];
      card.innerHTML = `<div>${step.q}</div><div class="tutorial-actions">
        ${idx>0?'<button id="prevTut" class="action">Назад</button>':''}
        <button id="skipTut" class="action warn">Пропустить</button>
        <button id="nextTut" class="action">${step.btn||'Далее'}</button>
      </div>`;
      // position highlight
      if (step.target) {
        const r = step.target.getBoundingClientRect();
        highlight.style.left = `${r.left - 8}px`;
        highlight.style.top = `${r.top - 8}px`;
        highlight.style.width = `${r.width + 16}px`;
        highlight.style.height = `${r.height + 16}px`;
        highlight.style.display = 'block';
      } else {
        highlight.style.display = 'none';
      }
      card.querySelector('#skipTut').onclick = end;
      const prev = card.querySelector('#prevTut'); if (prev) prev.onclick = () => { idx = Math.max(0, idx-1); renderStep(); };
      card.querySelector('#nextTut').onclick = () => { idx++; if (idx>=steps.length) end(); else renderStep(); };
    }

    function end() { overlay.remove(); }
    renderStep();
  }

  function update() {
    el.day.textContent = `День ${state.day}`;
    el.health.textContent = `Здоровье: ${state.health}%`;
    el.tempVal.textContent = `${Math.round(state.env.temp)}°C`;
    el.humVal.textContent = `${Math.round(state.env.humidity)}%`;
    el.o2Val.textContent = `${Math.round(state.env.oxygen || 0)}`;
    el.soilVal.textContent = `${Math.round(state.env.soil)}%`;
    el.waterVal.textContent = `${Math.round(state.env.water)}`;
    el.ap.textContent = `${Math.floor(state.resources.ap)}`;
    el.budget.textContent = `${Math.floor(state.resources.budget)}`;
    el.mitigateBtn.disabled = !state.disaster;

    drawViz(el.canvas, state);
    renderPopChips();
  }

  function renderPopChips() {
    const colors = {
      grass: '#58d68d', shrub: '#8bd6a5', tree: '#43b37b',
      rabbit: '#ffd580', deer: '#ffb870',
      fox: '#ff8a70', wolf: '#b3c2ff'
    };
    el.popBar.innerHTML = '';
    for (const k of ['grass','shrub','tree','rabbit','deer','fox','wolf']) {
      const chip = document.createElement('div');
      chip.className = 'pop-chip';
      const dot = document.createElement('div');
      dot.className = 'pop-dot';
      dot.style.background = colors[k];
      const v = Math.round(state.species[k] || 0);
      chip.append(dot, document.createTextNode(`${label(k)} ${v}`));
      chip.onclick = () => modal(label(k), detail(k, v));
      el.popBar.appendChild(chip);
    }
  }

  function label(k) {
    return ({
      grass: 'Трава', shrub: 'Кустарники', tree: 'Деревья',
      rabbit: 'Зайцы', deer: 'Олени',
      fox: 'Лисы', wolf: 'Волки'
    })[k] || k;
  }

  function detail(k, v) {
    const desc = {
      grass: 'Быстрорастущие растения, 2 O₂/день.',
      shrub: 'Средний рост, 5 O₂/день.',
      tree: 'Медленный рост, 10 O₂/день.',
      rabbit: '1 потомок каждые 3 дн., ест траву.',
      deer: '1 потомок каждые 7 дн., ест кустарники.',
      fox: 'Охотится на зайцев, 1 потомок/10 дн.',
      wolf: 'Охотится на оленей, 1 потомок/15 дн.'
    }[k] || '';
    return `<div><b>${label(k)}</b><div>Численность: ${v}</div><div style="color:#9cb6a7">${desc}</div></div>`;
  }

  function setPaused(p) {
    el.pauseBtn.textContent = p ? '▶️' : '⏸';
  }

  function setSpeed(v) {
    el.speedLabel.textContent = `x${v}`;
  }

  function toast(msg, level='info') {
    const t = document.createElement('div');
    t.className = `toast ${level}`;
    t.textContent = msg;
    el.toasts.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  function modal(title, html, mount) {
    el.modalTitle.textContent = title;
    el.modalBody.innerHTML = html;
    el.modal.classList.remove('hidden');
    if (mount) mount(el.modalBody);
  }
  function hideModal() { el.modal.classList.add('hidden'); }

  return { update, setPaused, setSpeed, toast, modal, tutorial };
}