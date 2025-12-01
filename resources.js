export function createResources(state) {
  function regen() {
    state.resources.ap = Math.min(state.resources.apMax, state.resources.ap + 10);
  }
  function canSpend(ap, budget) {
    return state.resources.ap >= ap && state.resources.budget >= budget;
  }
  function spend(ap, budget) {
    state.resources.ap -= ap;
    state.resources.budget -= budget;
  }
  function reward(health) {
    // reward budget based on overall health and simple biodiversity metric
    // higher health and more species => larger periodic budget gains
    const base = Math.round((health / 100) * 40); // up to +40
    // biodiversity: count species with >1 individuals (excluding decomposers)
    const species = state.species || {};
    let bio = 0;
    for (const k of ['grass','shrub','tree','rabbit','deer','fox','wolf']) if ((species[k] || 0) > 1) bio++;
    const bioBonus = bio * 6; // up to +42
    const gain = base + bioBonus;
    if (gain > 0) state.resources.budget += gain;
  }
  return { regen, canSpend, spend, reward };
}

