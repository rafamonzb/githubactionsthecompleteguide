// const button = document.getElementById("button");

const currentNameE1 = document.getElementById("current-name");
const nextNameE1 = document.getElementById("next-name");

const API_BASE = "https://pokeapi.co/api/v2/evolution-chain/"

function randId() {
  return Math.floor(Math.random() * 254) + 1;
}

async function sleep(ms) {
  return new Promise( r => setTimeout(r,ms) );
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function pickBaseAndNext(chainRoot){
  const base = chainRoot?.species?.name;
  const next = chainRoot?.evolves_to?.[0]?.species?.name;
  return {base, next};
}

async function run() {
  currentNameE1.textContent = "-";
  nextNameE1.textContent = "-";

  try {
    const {data} = await getRandomEvolutionChain();
    const {base,next} = pickBaseAndNext(data.chain);

    if (!base) throw new Error("La cadena no tiene especie base.");

    currentNameE1.textContent = base;
    nextNameE1.textContent = next ?? "No tiene siguiente evolución";
  } catch (e) {
    console.error(e);
  }
}

const deps = { randId, fetchJson, sleep, run };
function __setDeps(patch) { Object.assign(deps, patch) };
function __getDeps() { return deps; }

async function getRandomEvolutionChain() {
  for (let attempt =1; attempt <= 10; attempt++) {
    const id = deps.randId();
    try {
      const data = await deps.fetchJson(`${API_BASE}${id}/`);
      return {id,data};
    } catch {
      await deps.sleep(100 + attempt*50);
    }
  }
  throw new Error("No se pudo obtener la cadena de evolución");
}

function wireUI(html = (typeof document !== 'undefined' ? document : null), handler = run){
  if (!html) return;
  const button = html.getElementById('button'); 

  if (button) button.addEventListener('click', () => handler(html));
}

module.exports = {
  API_BASE,
  randId,
  sleep,
  fetchJson,
  pickBaseAndNext,
  getRandomEvolutionChain,
  run,
  wireUI,
  __setDeps,
  __getDeps
};

if (typeof window !== 'undefined') window.Pokevolution = module.exports
