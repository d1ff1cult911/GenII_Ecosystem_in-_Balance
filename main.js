import { createEcosystem } from './modules/ecosystem.js';
import { createEvents } from './modules/events.js';
import { createResources } from './modules/resources.js';
import { makeUI } from './modules/ui.js';
import { Storage } from './modules/storage.js';
import { Charts } from './modules/charts.js';

const TICK_MS_BASE = 5000; // 1 game day
let speed = 1;
let paused = false;
let tickTimer = null;
let started = false;

const store = Storage('ecosim_v1');
const state = loadOrInit();

const eco = createEcosystem(state);
const events = createEvents(state);
const resources = createResources(state);
const charts = Charts(
  document.getElementById('popChart'),
  document.getElementById('envChart'),
  state
);
const ui = makeUI(state, {
  onAdjustTemp: (dir) => attemptAction(() => eco.adjustTemp(dir), 5, 0),
  onAdjustHum: (dir) => attemptAction(() => eco.adjustHum(dir), 3, 0),
  onAdd: (what) => {
    const map = {
      'plant:grass': { ap: 20, budget: 100, fn: () => eco.addSpecies('grass', 10) },
      'plant:shrub': { ap: 20, budget: 100, fn: () => eco.addSpecies('shrub', 5) },
      'plant:tree': { ap: 20, budget: 100, fn: () => eco.addSpecies('tree', 2) },
      'herb:rabbit': { ap: 30, budget: 200, fn: () => eco.addSpecies('rabbit', 4) },
      'herb:deer': { ap: 30, budget: 200, fn: () => eco.addSpecies('deer', 1) },
      'pred:fox': { ap: 50, budget: 300, fn: () => eco.addSpecies('fox', 1) },
      'pred:wolf': { ap: 50, budget: 300, fn: () => eco.addSpecies('wolf', 1) },
    };
    const a = map[what];
    attemptAction(a.fn, a.ap, a.budget);
  },
  onMitigate: () => attemptAction(() => events.mitigate(), 40, 0),
  onPause: togglePause,
  onSpeedUp: () => setSpeed(Math.min(4, speed + 1)),
  onSpeedDown: () => setSpeed(Math.max(1, speed - 1)),
  onOpenSettings,
  onOpenInfo,
  onOpenThreats: () => onOpenThreats(),
  onOpenHealth: () => onOpenHealth()
});

updateAll();
// do not auto-start; wait for player to press Start
wireStartScreen();

function startLoop() {
  clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    if (paused) return;
    gameDay();
  }, TICK_MS_BASE / speed);
}

function wireStartScreen() {
  const start = document.getElementById('startScreen');
  const startBtn = document.getElementById('startBtn');
  const tutBtn = document.getElementById('startTutorialBtn');
  if (!start || !startBtn) {
    // fallback: start immediately
    started = true;
    startLoop();
    return;
  }
  startBtn.onclick = () => {
    started = true;
    start.classList.add('hidden');
    startLoop();
  };
  tutBtn.onclick = () => {
    started = true;
    start.classList.add('hidden');
    // open tutorial via UI helper
    ui.tutorial();
    startLoop();
  };
}

function gameDay() {
  state.day += 1;
  resources.regen();
  events.applyClimateDrift();
  events.rollDaily();
  eco.step();
  const health = eco.computeHealth();
  state.health = health;
  resources.reward(health);
  charts.pushDay();

  ui.update();
  charts.render();
  eco.checkWinLose();

  store.save(state);
}

function attemptAction(fn, apCost, budgetCost) {
  if (!resources.canSpend(apCost, budgetCost)) return ui.toast('Недостаточно ресурсов', 'warn');
  resources.spend(apCost, budgetCost);
  fn();
  ui.update();
  store.save(state);
}

function togglePause() {
  paused = !paused;
  ui.setPaused(paused);
}

function setSpeed(v) {
  speed = v;
  ui.setSpeed(v);
  startLoop();
}

function onOpenSettings() {
  ui.modal('Настройки', `
    <div style="display:grid;gap:8px">
      <button id="resetBtn" class="action warn">Сбросить игру</button>
    </div>
  `, (root) => {
    root.querySelector('#resetBtn').onclick = () => {
      store.clear();
      location.reload();
    };
  });
}

function onOpenInfo() {
  ui.modal('Как бороться с угрозами и что менять', `
    <div style="display:grid;gap:8px">
      <div><b>Пожар</b> — снижает растения и плодородие. Меры: повысить влажность, добавить воду, снижать температуру при возможности. Используйте "Устранить угрозу" для ускорения завершения.</div>
      <div><b>Засуха</b> — падает влажность и вода. Меры: повышайте влажность, сохраняйте почву (деревья и кусты помогают), добавляйте растения устойчивые к засухе.</div>
      <div><b>Наводнение</b> — терпят животные и разрушается почва. Меры: снизьте влажность и перенаправляйте воду (симулируйте снижением добавок воды), восстанавливайте растения и почву.</div>
      <div><b>Эпидемия</b> — поражает вид. Меры: уменьшайте плотность популяций (не добавляйте новых), поддерживайте разнообразие соседних видов, используйте "Устранить угрозу".</div>
      <div><b>Инвазивные виды</b> — вытесняют растения. Меры: добавляйте конкурентные растения (деревья/кусты), контролируйте плотность травоядных, используйте "Устранить угрозу".</div>
      <div style="color:var(--muted)">Общие советы: поддерживайте влажность ~50–70% и температуру близко к 15–22°C для большинства видов; повышайте почву через разложение органики; богатое биоразнообразие и высокий показатель здоровья приносят бюджет.</div>
    </div>
  `);
}

function onOpenThreats() {
  ui.modal('Угрозы и как с ними бороться', `
    <div style="display:grid;gap:10px">
      <div><b>Как пользоваться этой вкладкой</b> — выберите угрозу, прочитайте причины и конкретные параметры, которые можно изменить. Многие меры требуют очков действий (AP) или бюджета.</div>
      <div style="display:grid;gap:8px;padding:6px;border-radius:8px;background:rgba(255,255,255,0.02)">
        <div><b>Пожар</b> — признаки: резкое падение растений, усиленное пересыхание почвы.</div>
        <div style="color:var(--muted)">Действия: повысить влажность (+hum кнопки), снизить темп. Добавьте растения/кусты, чтобы восстановить почву. Используйте 'Устранить угрозу' (AP: 40) для ускорения.</div>
        <div style="color:var(--muted)"><b>Совет:</b> дождитесь снижения температуры перед массовой посадкой, чтобы уменьшить риск повторного возгорания.</div>
      </div>

      <div style="display:grid;gap:8px;padding:6px;border-radius:8px;background:rgba(255,255,255,0.02)">
        <div><b>Засуха</b> — признаки: падает вода и влажность, растения дают меньше O₂.</div>
        <div style="color:var(--muted)">Действия: повышайте влажность (кнопки влажн.), избегайте резких повышений температуры, добавляйте долгоживущие растения (кусты/деревья) — они помогают удерживать влагу. Поддерживайте почву через разложение органики.</div>
      </div>

      <div style="display:grid;gap:8px;padding:6px;border-radius:8px;background:rgba(255,255,255,0.02)">
        <div><b>Наводнение</b> — признаки: внезапный рост уровня воды, падение численности некоторых животных.</div>
        <div style="color:var(--muted)">Действия: снизьте влажность, избегайте посадки чувствительных трав и временно не добавляйте животных. Восстанавливайте почву и растения после спада воды.</div>
      </div>

      <div style="display:grid;gap:8px;padding:6px;border-radius:8px;background:rgba(255,255,255,0.02)">
        <div><b>Эпидемия</b> — признаки: резкое падение численности одного вида.</div>
        <div style="color:var(--muted)">Действия: не добавляйте новых особей поражённого вида, уменьшайте плотность (паузы добавления), поддерживайте разнообразие — наличие хищников и конкурентов снижает распространение. Используйте 'Устранить угрозу'.</div>
      </div>

      <div style="display:grid;gap:8px;padding:6px;border-radius:8px;background:rgba(255,255,255,0.02)">
        <div><b>Инвазивные виды</b> — признаки: постепенное снижение числа растений при стабильных других условиях.</div>
        <div style="color:var(--muted)">Действия: добавляйте конкурентоспособные растения (кусты/деревья), контролируйте травоядных, используйте 'Устранить угрозу'. В долгосрочной перспективе диверсификация флоры помогает.</div>
      </div>

      <div style="color:var(--muted)">Краткая памятка по параметрам: <br>— Темп.: уменьшает/увеличивает скорость испарения и комфорт видов. <br>— Влажн.: напрямую влияет на рост растений и уровень воды. <br>— Почва: улучшает рост растений; повышается при разложении органики. <br>— O₂: отражает зелёную биомассу — следите за растениями.</div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="closeThreats" class="action">Закрыть</button>
      </div>
    </div>
  `, (root) => {
    root.querySelector('#closeThreats').onclick = () => { document.getElementById('modal').classList.add('hidden'); };
  });
}

function onOpenHealth() {
  ui.modal('Как повысить и снизить здоровье системы', `
    <div style="display:grid;gap:10px">
      <div><b>Что влияет на здоровье экосистемы</b> — разнообразие видов, баланс растений и животных, параметры среды (температура, влажность, почва, вода) и события (пожары, засуха, болезни).</div>

      <div style="display:grid;gap:6px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.02)">
        <div><b>Как повысить здоровье (быстро и устойчиво)</b></div>
        <ul style="color:var(--muted);margin:0;padding-left:18px">
          <li>Поддерживайте влажность ~50–70% и температуру 15–22°C — это увеличит рост растений и выживание животных.</li>
          <li>Добавляйте растения (трава → куст → дерево) — деревья и кусты повышают стабильность почвы и запас воды.</li>
          <li>Сбалансируйте хищников и травоядных — хищники контролируют перенаселение травоядных и уменьшают эпидемии.</li>
          <li>Используйте "Устранить угрозу" при бедствиях — это ускоряет завершение событий и снижает урон.</li>
          <li>Позвольте декапитации органики разлагаться — разложение повышает плодородие почвы.</li>
          <li>Следите за биоразнообразием — бонус к бюджету и стабильности.</li>
        </ul>
      </div>

      <div style="display:grid;gap:6px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.02)">
        <div><b>Что снижает здоровье (чего избегать)</b></div>
        <ul style="color:var(--muted);margin:0;padding-left:18px">
          <li>Резкие и постоянные колебания температуры и влажности (частые большие правки).</li>
          <li>Массовые добавления одного вида без конкуренции — приводит к истощению ресурсов.</li>
          <li>Игнорирование почвы и органики — снижает регенерацию растений.</li>
          <li>Неэффективное тратение бюджета и AP — отсутствие возможностей для реагирования на бедствия.</li>
        </ul>
      </div>

      <div style="color:var(--muted)">Практическая подсказка: если здоровье падает — временно остановите добавления новых животных, повышайте влагу и добавляйте несколько кустов/деревьев; если наблюдаете вспышки болезней — избегайте пополнения поражённого вида и используйте "Устранить угрозу".</div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="closeHealth" class="action">Закрыть</button>
      </div>
    </div>
  `, (root) => {
    root.querySelector('#closeHealth').onclick = () => { document.getElementById('modal').classList.add('hidden'); };
  });
}

function loadOrInit() {
  const saved = Storage('ecosim_v1').load();
  if (saved) return saved;
  return {
    day: 1,
    health: 100,
    env: { temp: 20, humidity: 60, oxygen: 0, soil: 70, water: 50 },
    resources: { ap: 10, apMax: 100, budget: 1000 },
    disaster: null,
    species: {
      grass: 100,
      shrub: 0,
      tree: 0,
      rabbit: 20,
      deer: 0,
      fox: 5,
      wolf: 0,
      decomposer: 0,
    },
    deadOrganic: 0,
    history: {
      days: [],
      pops: [],
      env: [],
      maxLen: 30,
    },
    lose: null,
    win: null,
  };
}

function updateAll() {
  ui.update();
  charts.pushDay(true);
  charts.render();
}