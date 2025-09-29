const button = document.getElementById("button");

const currentNameE1 = document.getElementById("current-name");
const nextNameE1 = document.getElementById("next-name");

export const API_BASE = "https://pokeapi.co/api/v2/evolution-chain/"

export function randId() {
  return Math.floor(Math.random() * 255) + 1;
}

export async function sleep(ms) {
  return new Promise( r => setTimeout(r,ms) );
}

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

export function pickBaseAndNext(chainRoot){
  const base = chainRoot?.species?.name;
  const next = chainRoot?.evolves_to?.[0]?.species?.name;
  return {base, next};
}

export async function getRandomEvolutionChain() {
  for (let attempt =1; attempt <= 10; attempt++) {
    const id = randId();
    try {
      const data = await fetchJson(`${API_BASE}${id}/`);
      return {id,data};
    } catch (e) {
      await sleep(100 + attempt*50);
    }
  }
  throw new Error("No se pudo obtener la cadena de evolución");
}

async function run() {
  currentNameE1.textContent = "-";
  nextNameE1.textContent = "-";

  try {
    const {id,data} = await getRandomEvolutionChain();
    const {base,next} = pickBaseAndNext(data.chain);

    if (!base) throw new Error("La cadena no tiene especie base.");

    currentNameE1.textContent = base;
    nextNameE1.textContent = next ?? "No tiene siguiente evolución";
  } catch (e) {
    console.error(e);
  }
}

button.addEventListener("click",run);
