import test from 'node:test'
import assert from 'node:assert/strict'
import { shortestAngleDelta, stepSpring } from '../src/utils/music-physics.ts'

test('underdamped float-in spring overshoots gently and settles on target', () => {
  const spring = { value: 0, velocity: 0 }
  let maxVal = 0
  let moving = true
  for (let i = 0; i < 180 && moving; i++) {
    moving = stepSpring(spring, 1, 205, 14.8, 1 / 60)
    if (spring.value > maxVal) maxVal = spring.value
  }
  assert.ok(maxVal > 1.03, `expected subtle overshoot above 1.0, got ${maxVal}`)
  assert.equal(spring.value, 1, 'spring settles exactly at target')
  assert.equal(spring.velocity, 0, 'settled spring clears residual velocity')
  assert.equal(moving, false, 'settled spring signals idle so rAF can stop')
})

test('stepSpring clamps large dt spikes so backgrounded tabs never explode', () => {
  const spring = { value: 0, velocity: 0 }
  stepSpring(spring, 1, 205, 14.8, 5.0)
  assert.ok(Number.isFinite(spring.value) && Math.abs(spring.value) < 2, 'large dt stays bounded')
})

test('shortestAngleDelta wraps multi-turn 360-degree orbits cleanly back to 0', () => {
  assert.equal(shortestAngleDelta(350, 0), 10)
  assert.equal(shortestAngleDelta(-350, 0), -10)
  assert.equal(shortestAngleDelta(730, 0), -10)
  assert.equal(shortestAngleDelta(-170, 0), 170)
  assert.equal(shortestAngleDelta(0, 0), 0)
})
