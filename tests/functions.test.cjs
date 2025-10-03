/**
 * @jest-environment jsdom
 */

const mod = require('../src/functions.cjs');

beforeEach(() => {
  document.body.innerHTML =`
    <div class="controls">
      <button type="button" id="button">Random</button>
      <span id="status"><span>
      <span id="current-name" class="name">-</span>
      <span id="next-name" class="name">-</span>
    </div>
  `;
});

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
  mod.__setDeps({
    randId: mod.randId,
    fetchJson: mod.fetchJson,
    sleep: mod.sleep,
    run: mod.run
  });
});

// import {expect, jest, test, describe, global} from "@jest/globals";
// const jest = require('@jest/globals')

test('wireUI uses given handler', () => {
  document.body.innerHTML = `
    <button id="button">Random</button>
    <span id="status"><span>
    <span id="current-name" class="name">-</span>
    <span id="next-name" class="name">-</span>
  `;
  const handler = jest.fn();

  mod.wireUI(document, handler);
  document.getElementById('button').click();

  expect(handler).toHaveBeenCalled();
});

test('button exists', () => {
  expect(document.getElementById('button')).not.toBeNull();
});

describe('randId', () => {
  afterEach(() => { jest.restoreAllMocks() });

  test('return 1 when Math.random() = 0', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(mod.randId()).toBe(1);
  });

  test('return 255 when Math.random() = 1', () => {
    jest.spyOn(Math, 'random').mockReturnValue(1);
    expect(mod.randId()).toBe(255);
  });

  test('return valid int', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(mod.randId()).toBe(128);
    expect(Number.isInteger(mod.randId())).toBe(true);
  });
});

describe('sleep', () => {
  jest.useFakeTimers();

  test('resolve after set time', async () => {
    const p = mod.sleep(1000);
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
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

    await expect(mod.fetchJson('http://x/y')).resolves.toEqual({ok: 1});
    expect(global.fetch).toHaveBeenCalledWith('http://x/y');
  });

  test('returns error when ok=false', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    await expect(mod.fetchJson('http://x/z')).rejects.toThrow('HTTP 503 for http://x/z');
  });
});

describe('pickBaseAndNext', () => {
  test('extracts base and next when they exist', async () => {
    const input = {
      species: { name: 'bulbasaur' },
      evolves_to: [{ species: { name: 'ivysaur' } }],
    };
    expect(mod.pickBaseAndNext(input)).toEqual({ base: 'bulbasaur', next: 'ivysaur'});
  });

  test('missing properties toleration and undefined responses', async () => {
    expect(mod.pickBaseAndNext({})).toEqual({ base: undefined, next: undefined });
    expect(mod.pickBaseAndNext({ species: {} })).toEqual({ base: undefined, next: undefined });
  });
});

describe('getRandomEvolutionChain', () => {
  jest.useFakeTimers();

  test('return {id, data} first try (happy ending)', async () => {
    mod.__setDeps({ sleep: jest.fn().mockResolvedValue() });

    jest.spyOn(Math, 'random').mockReturnValue(0.2);

    const fetchMock = jest.fn().mockResolvedValue({ chain: 'ok' });
    mod.__setDeps({ fetchJson: fetchMock })

    const result = await mod.getRandomEvolutionChain();

    expect(fetchMock).toHaveBeenCalledWith(`${mod.API_BASE}51/`);
    expect(result).toEqual({ id: 51, data: { chain: 'ok' } });
  });

  test('retry until success after failure', async () => {
    mod.__setDeps({ sleep: jest.fn().mockResolvedValue() });

    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.04)
      .mockReturnValueOnce(0.05)
      .mockReturnValueOnce(0.06);

    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce({ok: false,status: 500,json: async () => ({}) })
      .mockRejectedValueOnce({ok: false,status: 500,json: async () => ({}) })
      .mockResolvedValueOnce({ chain: 'ok' });

    mod.__setDeps({ fetchJson: fetchMock });

    const result = await mod.getRandomEvolutionChain();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.data).toEqual({ chain: 'ok' });
  });

  test('throw error after 10 failures', async () => {
    mod.__setDeps({ sleep: jest.fn().mockResolvedValue() });

    jest.spyOn(Math, 'random').mockReturnValue(0.01);

    const fetchMock = jest.fn().mockRejectedValue(new Error('down'));

    mod.__setDeps({ fetchJson: fetchMock });
    
    await expect(mod.getRandomEvolutionChain()).rejects.toThrow('No se pudo obtener la cadena de evolución');

    expect(fetchMock).toHaveBeenCalledTimes(10);
  });
});
