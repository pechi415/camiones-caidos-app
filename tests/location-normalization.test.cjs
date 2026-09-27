const { test } = require('node:test');
const assert = require('node:assert/strict');

const cases = [
  ['botadero + 110 rampa G', 'Botadero + 110 Rampa G'],
  ['Botadero + 110 Rampa G', 'Botadero + 110 Rampa G'],
  ['botadero+110 rampa g', 'Botadero +110 Rampa G'],
  ['btd + 110 rampa g', 'Botadero + 110 Rampa G'],
  ['botaderos + 110', 'Botadero + 110'],
  ['botadero norte', 'Botadero Norte'],
  ['bot 4', 'Botadero 4'],
  ['btdr-4', 'Botadero 4'],
  ['btd4', 'Botadero 4'],
  ['botadero', 'Botadero'],
  ['botanico norte', 'Botanico Norte'],
  ['bh 2', 'Bahía 2'],
  ['tlr central', 'Taller Central'],
  ['rmp 1', 'Rampa 1'],
  ['pl 8', 'Pala 8']
];
for (const [input, expected] of cases) {
  test('location: ' + input, async () => {
    const { correctTextWithAI } = await import('../src/utils/aiCorrector.js');
    // The UI normalizes on blur and again on submit; both must preserve the location.
    const blurred = correctTextWithAI(input, 'location');
    assert.equal(blurred, expected);
    assert.equal(correctTextWithAI(blurred, 'location'), expected);
  });
}
