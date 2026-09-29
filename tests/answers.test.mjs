import test from 'node:test';
import assert from 'node:assert/strict';
import { ANSWERS, pickAnswer } from '../test/scratch/answers/answers.js';

test('all ten supplied answers are unique', () => {
  assert.equal(ANSWERS.length, 10);
  assert.equal(new Set(ANSWERS).size, 10);
});

test('first draw covers every answer with equal intervals', () => {
  const counts = new Array(10).fill(0);
  for (let n = 0; n < 10000; n++) counts[pickAnswer(-1, () => (n + .5) / 10000)]++;
  assert.deepEqual(counts, new Array(10).fill(1000));
});

test('each prior answer is excluded and all other answers are equally reachable', () => {
  for (let previous = 0; previous < ANSWERS.length; previous++) {
    const counts = new Array(10).fill(0);
    for (let n = 0; n < 9000; n++) counts[pickAnswer(previous, () => (n + .5) / 9000)]++;
    assert.equal(counts[previous], 0);
    assert.deepEqual(counts.filter((_, i) => i !== previous), new Array(9).fill(1000));
    assert.notEqual(pickAnswer(previous, () => 0), previous);
    assert.notEqual(pickAnswer(previous, () => 1 - Number.EPSILON), previous);
  }
});
