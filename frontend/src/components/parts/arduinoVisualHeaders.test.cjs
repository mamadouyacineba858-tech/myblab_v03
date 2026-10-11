const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const jsx = fs.readFileSync(path.join(__dirname, 'ArduinoPart.jsx'), 'utf8')
const css = fs.readFileSync(path.join(__dirname, 'ArduinoPart.css'), 'utf8')
const region = jsx.split('const VISUAL_ONLY_HEADERS = [')[1]?.split(']')[0]
assert.ok(region, 'visual-only header definition must exist')
const pins = [...region.matchAll(/\{ id: '([^']+)', x: ([0-9.]+) \}/g)].map((m) => ({ id: m[1], x: Number(m[2]) }))

test('all thirteen bottom header legends are present in physical order', () => {
  assert.deepEqual(pins.map((pin) => pin.id),
    ['IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'])
  assert.equal(pins.length, 13)
  assert.ok(pins.every((pin, index) => index === 0 || pin.x > pins[index - 1].x))
})

test('identifiers are visual only and do not create circuit contacts', () => {
  assert.match(jsx, /data-arduino-visual-pin=\{id\}/)
  assert.match(jsx, /title=\{id \+ ' — repère visuel de la carte'\}/)
  assert.doesNotMatch(region, /contacts|wireConnectable|breadboardInsertable/)
})

test('labels are shown on hover, not permanently painted over the raster', () => {
  assert.match(css, /\.part-arduino__visual-identifier:hover::after/)
  assert.match(css, /content: attr\(data-arduino-visual-pin\)/)
})
