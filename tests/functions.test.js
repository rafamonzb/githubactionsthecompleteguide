/**
 * @jest-environment mode
 */
import{
  API_BASE,
  randId,
  sleep,
  fetchJson,
  pickBaseAndNext,
  getRandomEvolutionChain
} from "../functions.js"

import {expect, jest, test, describe, global} from "@jest/globals";

describe('randId', () => {
  test('random number is between 1 and 255', () => {
    const origRandom = Math.random;
    try {
      Math.random = () => 0;
      expect(randId()).toBe(1);
      Math.random = () => 0.999;
      expect(randId()).toBeGreaterThanOrEqual(1);
      expect(randId()).toBeLessThanOrEqual(255);
      Math.random = () => 0.5;
      expect(Number.isInteger(randId())).toBe(true);
    } finally {
      Math.random = origRandom;
    }
  });
});

describe('sleep', () => {
  jest.useFakeTimers();

  test('resolve after set time', async () => {
    const p = sleep(1000);
    jest.advanceTimersByTime(1000);
    await expect(p).resolves.toBeUndefined();
  });
});

describe('fetchJson', () => {
  afterEach(() => {
    global.fetch?.mockReset?.();
  });

  test('returns JSON when ok=true', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ok: 1}),
    });

    await expect(fetchJson('http://x/y')).resolves.toEqual({ok: 1});
    expect(global.fetch).toHaveBeenCalledWith('http://x/y');
  });

  test('returns error when ok=false', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    await expect(fetchJson('http://x/z')).rejects.toThrow('HTTP 503 for http://x/z');
  });
});

describe('pickBaseAndNext', () => {
  test('extracts base and next when they exist', async () => {
    const input = {
      species: { name: 'bulbasaur' },
      evolves_to: [{ species: { name: 'ivysaur' } }],
    };
    expect(pickBaseAndNext(input)).toEqual({ base: 'bulbasaur', next: 'ivysaur'});
  });

  test('missing properties toleration and undefined responses', async () => {
    expect(pickBaseAndNext({})).toEqual({ base: undefined, next: undefined });
    expect(pickBaseAndNext({ species: {} })).toEqual({ base: undefined, next: undefined });
  });
});

describe('getRandomEvolutionChain', () => {
  jest.useFakeTimers();

  let mod;

  beforeAll(async () => {
    mod = await import('../functions.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('return {id, data} first try (happy ending)', async () => {
    const spyRand = jest.spyOn(mod, 'randId').mockReturnValue(42);
    const spyFetchJson = jest.spyOn(mod, 'fetchJson').mockResolvedValue({ chain: 'ok' });
    const spySleep = jest.spyOn(mod, 'sleep');

    const result = await getRandomEvolutionChain();

    expect(spyRand).toHaveBeenCalledTimes(1);
    expect(spyFetchJson).toHaveBeenCalledWith(`${API_BASE}42/`);
    expect(spySleep).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 42, data: { chain: 'ok' } });
  });

  test('retry until success after failure', async () => {
    const spyRand = jest.spyOn(mod, 'randId')
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(11)
      .mockReturnValueOnce(12);

    const spyFetchJson = jest.spyOn(mod, 'fetchJson')
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue({ chain: 'ok' });
    
    const spySleep = jest.spyOn(mod, 'sleep').mockResolvedValue();

    const p = getRandomEvolutionChain();

    await Promise.resolve();
    const result = await p;

    expect(spyRand).toHaveBeenCalledTimes(3);
    expect(spyFetchJson).toHaveBeenCalledTimes(3);
    expect(spySleep).toHaveBeenCalledTimes(2);

    expect(spySleep).toHaveBeenNthCalledWith(1, 150);
    expect(spySleep).toHaveBeenNthCalledWith(1, 200);

    expect(result).toEqual({ id: 12, data: { chain: 'ok' } });
  });

  test('throw error after 10 failures', async () => {
    jest.spyOn(mod, 'randId').mockReturnValue(7);
    jest.spyOn(mod, 'fetchJson').mockRejectedValue(new Error('always down'));
    const spySleep = jest.spyOn(mod, 'sleep').mockResolvedValue();

    const p = getRandomEvolutionChain();

    await expect(p).rejects.toThrow('No se pudo obtener la cadena de evolución');

    expect(spySleep).toHaveBeenCalledTimes(10);

    expect(spySleep).toHaveBeenNthCalledWith(1, 150);
    expect(spySleep).toHaveBeenNthCalledWith(10, 100 + 10 * 50);
  });
});
