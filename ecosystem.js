export function createEcosystem(state) {
  const plantO2 = { grass: 2, shrub: 5, tree: 10 };
  const herbDiet = { rabbit: { food: 'grass', perDay: 5 }, deer: { food: 'shrub', perDay: 10 } };
  const predDiet = { fox: { prey: 'rabbit', perWeek: 2 }, wolf: { prey: 'deer', perWeek: 1 } };

  function clampEnv() {
    state.env.temp = Math.max(-10, Math.min(40, state.env.temp));
    state.env.humidity = Math.max(0, Math.min(100, state.env.humidity));
    state.env.soil = Math.max(0, Math.min(100, state.env.soil));
    state.env.water = Math.max(0, Math.min(100, state.env.water));
  }

  function suitabilityPlant() {
    // simple suitability from temp/humidity/soil
    const t = 1 - Math.min(1, Math.abs(state.env.temp - 20) / 20);
    const h = state.env.humidity / 100;
    const s = state.env.soil / 100;
    return (t * 0.5 + h * 0.25 + s * 0.25);
  }

  function suitabilityHerb() {
    const t = 1 - Math.min(1, Math.abs(state.env.temp - 15) / 25);
    const h = state.env.humidity / 100;
    return (t * 0.6 + h * 0.4);
  }

  function suitabilityPred() {
    const t = 1 - Math.min(1, Math.abs(state.env.temp - 10) / 30);
    return t;
  }

  function plantGrowth() {
    const suit = suitabilityPlant();
    // growth influenced by soil and water; water derived from humidity
    state.env.water = Math.min(100, state.env.water + Math.max(0, state.env.humidity - 50) * 0.02);
    const soilFactor = state.env.soil / 100;
    const base = { grass: 0.10, shrub: 0.06, tree: 0.03 };
    for (const k of ['grass', 'shrub', 'tree']) {
      const pop = state.species[k];
      const growth = pop * (base[k] * suit * soilFactor);
      const mortality = pop * (0.02 + (1 - suit) * 0.05);
      state.species[k] = Math.max(0, pop + growth - mortality);
    }
    // oxygen production
    let o2 = 0;
    for (const k of ['grass', 'shrub', 'tree']) {
      o2 += state.species[k] * plantO2[k] * 0.01; // scale
    }
    state.env.oxygen = Math.max(0, Math.min(1000, (state.env.oxygen || 0) + o2 - totalAnimals() * 0.02));
  }

  function herbivoreStep() {
    const suit = suitabilityHerb();
    for (const h of ['rabbit', 'deer']) {
      let pop = state.species[h];
      if (pop <= 0) continue;
      const diet = herbDiet[h];
      const availablePlants = state.species[diet.food];
      const need = (diet.perDay * pop) / 10; // scale
      const eaten = Math.min(availablePlants, need);
      state.species[diet.food] = Math.max(0, availablePlants - eaten);
      const famine = need > eaten ? (need - eaten) / Math.max(1, need) : 0;
      // reproduction
      let reproInterval = h === 'rabbit' ? 3 : 7;
      const repro = (state.day % reproInterval === 0) ? Math.max(0, pop * 0.20 * suit) : 0;
      const death = pop * (0.03 + (1 - suit) * 0.07 + famine * 0.2);
      state.species[h] = Math.max(0, pop + repro - death);
      state.deadOrganic += death * 0.5;
    }
  }

  function predatorStep() {
    const suit = suitabilityPred();
    for (const p of ['fox', 'wolf']) {
      let pop = state.species[p];
      if (pop <= 0) continue;
      const diet = predDiet[p];
      // weekly consumption distributed daily
      const dailyPrey = (diet.perWeek / 7) * pop;
      const availablePrey = state.species[diet.prey];
      const hunted = Math.min(availablePrey, dailyPrey);
      state.species[diet.prey] = Math.max(0, availablePrey - hunted);
      const hunger = dailyPrey > hunted ? (dailyPrey - hunted) / Math.max(1, dailyPrey) : 0;
      // reproduction
      let reproInterval = p === 'fox' ? 10 : 15;
      const repro = (state.day % reproInterval === 0) ? Math.max(0, pop * 0.12 * suit) : 0;
      const death = pop * (0.03 + (1 - suit) * 0.05 + hunger * 0.25);
      state.species[p] = Math.max(0, pop + repro - death);
      state.deadOrganic += death * 0.8;
    }
  }

  function decomposers() {
    // decomposers appear based on dead organic
    const add = Math.min(5, state.deadOrganic * 0.05);
    state.species.decomposer = (state.species.decomposer || 0) + add;
    // convert organics to soil fertility
    const processed = Math.min(state.deadOrganic, state.species.decomposer * 0.5);
    state.deadOrganic = Math.max(0, state.deadOrganic - processed);
    state.env.soil = Math.min(100, state.env.soil + processed / 10); // +1% per 10 units
  }

  function density() {
    const areaScale = 1; // abstract
    return totalAnimals() / areaScale;
  }

  function totalAnimals() {
    return (state.species.rabbit + state.species.deer + state.species.fox + state.species.wolf);
  }

  function biodiversityCount() {
    let n = 0;
    for (const k of ['grass','shrub','tree','rabbit','deer','fox','wolf']) {
      if (state.species[k] > 1) n++;
    }
    return n;
  }

  function computeHealth() {
    const bio = biodiversityCount() / 7;
    const balancedPlants = Math.min(1, (state.species.grass + state.species.shrub + state.species.tree) / 200);
    const animalsOk = Math.min(1, totalAnimals() / 50);
    const envOk = 1 - (Math.abs(state.env.temp - 20) / 60) - (Math.abs(state.env.humidity - 60) / 200);
    const oxygenOk = Math.min(1, (state.env.oxygen || 0) / 300);
    const soilOk = state.env.soil / 100;
    const waterOk = Math.min(1, state.env.water / 60);
    const score = (
      bio * 0.2 +
      balancedPlants * 0.15 +
      animalsOk * 0.15 +
      Math.max(0, envOk) * 0.15 +
      oxygenOk * 0.15 +
      soilOk * 0.1 +
      waterOk * 0.1
    ) * 100;
    return Math.round(score);
  }

  function adjustTemp(dir) {
    state.env.temp += dir > 0 ? 1 : -1;
    clampEnv();
  }

  function adjustHum(dir) {
    state.env.humidity += dir > 0 ? 5 : -5;
    clampEnv();
  }

  function addSpecies(kind, amount) {
    state.species[kind] = Math.max(0, (state.species[kind] || 0) + amount);
  }

  function step() {
    clampEnv();
    plantGrowth();
    herbivoreStep();
    predatorStep();
    decomposers();
    // disasters impact
    if (state.disaster) {
      if (state.disaster.type === 'fire') {
        state.species.grass *= 0.7;
        state.species.shrub *= 0.8;
        state.species.tree *= 0.9;
        state.env.soil = Math.max(0, state.env.soil - 2);
      } else if (state.disaster.type === 'drought') {
        state.env.humidity = Math.max(0, state.env.humidity - 5);
        state.env.water = Math.max(0, state.env.water - 5);
      } else if (state.disaster.type === 'flood') {
        state.species.rabbit *= 0.9;
        state.species.deer *= 0.95;
        state.env.soil = Math.max(0, state.env.soil - 1);
      } else if (state.disaster.type === 'disease') {
        const t = state.disaster.target;
        if (state.species[t] != null) state.species[t] *= 0.85;
      } else if (state.disaster.type === 'invasive') {
        // invasive outcompetes: reduces target plants
        state.species.grass *= 0.95;
        state.species.shrub *= 0.95;
      }
      state.disaster.days -= 1;
      if (state.disaster.days <= 0) state.disaster = null;
    }
    // record history
    pushHistory();
  }

  function checkWinLose() {
    // win
    if (!state.win && state.day >= 100 && state.health > 70 && extinctCount() === 0) {
      state.win = true;
      toast('Победа! Экосистема в балансе.', 'info');
    }
    // lose conditions
    if (!state.lose) {
      if (extinctCount() >= 3) lose('Вымерло 3+ видов');
      // new: if there are no living organisms (excluding decomposers) -> lose
      const living = ['grass','shrub','tree','rabbit','deer','fox','wolf'].some(k => (state.species[k] || 0) >= 1);
      if (!living) return lose('Все живые организмы вымерли — игра окончена');
      // new: forced end if reach maximum day limit
      const MAX_DAY_LIMIT = 365;
      if (state.day >= MAX_DAY_LIMIT && !state.win) return lose('Достигнут предел дней — игра окончена');
      if (state.health < 30) {
        // track streak
        state._lowHealthDays = (state._lowHealthDays || 0) + 1;
        if (state._lowHealthDays >= 5) lose('Здоровье <30% 5 дней подряд');
      } else {
        state._lowHealthDays = 0;
      }
      if (state.resources.ap <= 0 && state.resources.budget <= 0) lose('Исчерпаны все ресурсы');
    }
  }

  function extinctCount() {
    let n = 0;
    for (const k of ['grass','shrub','tree','rabbit','deer','fox','wolf']) {
      if ((state.species[k] || 0) < 1) n++;
    }
    return n;
  }

  function toast(msg, level) {
    const el = document.createElement('div');
    el.className = `toast ${level||''}`;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  function pushHistory() {
    const h = state.history;
    h.days.push(state.day);
    h.pops.push({
      grass: state.species.grass,
      shrub: state.species.shrub,
      tree: state.species.tree,
      rabbit: state.species.rabbit,
      deer: state.species.deer,
      fox: state.species.fox,
      wolf: state.species.wolf,
    });
    h.env.push({
      temp: state.env.temp,
      hum: state.env.humidity,
      o2: state.env.oxygen || 0,
      soil: state.env.soil,
      water: state.env.water,
      health: state.health,
    });
    trim(h.days, h.maxLen);
    trim(h.pops, h.maxLen);
    trim(h.env, h.maxLen);
  }

  function trim(arr, max) {
    while (arr.length > max) arr.shift();
  }

  return {
    step, computeHealth, adjustTemp, adjustHum, addSpecies, checkWinLose
  };
}