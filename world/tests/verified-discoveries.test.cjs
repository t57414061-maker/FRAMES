const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { window: {}, document: {}, URL };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('world/verified-discoveries.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('world/catalog.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('world/schema.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('world/country-experience.js', 'utf8'), sandbox);

const discoveries = sandbox.window.FRAME_WORLD_VERIFIED_DISCOVERIES;
assert.ok(discoveries.length >= 20, 'Expected a substantial 2026 discovery batch');
const ids = new Set();
const names = new Set();
for (const item of discoveries) {
  assert.ok(item.id && item.name && item.country, 'Every discovery needs an id, name and country');
  assert.ok(!ids.has(item.id), 'Discovery IDs must be unique: ' + item.id);
  assert.ok(!names.has(item.name), 'Discovery names must be unique: ' + item.name);
  ids.add(item.id);
  names.add(item.name);
  assert.equal(new URL(item.url).protocol, 'https:', 'Sources must use HTTPS: ' + item.name);
  assert.ok(item.source && item.status && item.verifiedAt, 'Discovery provenance is required: ' + item.name);
  assert.equal(Object.hasOwn(item, 'latitude') || Object.hasOwn(item, 'longitude'), false, 'Do not invent coordinates');
}
const sample = {
  europe: [['Testland', 'Example City', 'Old Town']],
  regions: [
    { name: 'Africa', countries: [['Comoros', 'Moroni', 'Mount Karthala']] },
    { name: 'Asia', countries: [['India', 'New Delhi']] }
  ]
};
const countries = sandbox.window.FrameWorldCatalog.build(sample, {});
const comoros = countries.find(x => x.name === 'Comoros');
const saoTome = countries.find(x => x.name === 'São Tomé and Príncipe');
const southSudan = countries.find(x => x.name === 'South Sudan');
assert.ok(comoros && comoros.destinationNames.includes('The Medinas of the Historic Sultanates of the Comoros'));
assert.ok(saoTome && saoTome.region === 'Africa', 'Missing country should be added to its sourced world region');
assert.ok(southSudan && southSudan.destinationNames.includes('Boma–Badingilo Migratory Landscape'));
const museum = sandbox.window.FrameWorldCatalog.discovery('museum-of-word-kolkata');
assert.equal(museum.city, 'Kolkata');
assert.equal(museum.administrativeArea, 'West Bengal');
const countryRecord = sandbox.window.FrameCountryExperience.fromLegacy(saoTome.legacyRow, sandbox.window.FRAME_WORLD_RESEARCH, {id:saoTome.id, region:saoTome.region});
const rocas = countryRecord.destinations.find(x => x.id === 'rocas-sao-tome-principe');
assert.ok(rocas && rocas.source && rocas.source.url.startsWith('https://'));
assert.equal(rocas.researchStatus, 'Source checked');
const india = countries.find(x => x.name === 'India');
const indiaRecord = sandbox.window.FrameCountryExperience.fromLegacy(india.legacyRow, sandbox.window.FRAME_WORLD_RESEARCH, {id:india.id, region:india.region});
assert.equal(indiaRecord.regions[0].name, 'West Bengal');
assert.equal(indiaRecord.regions[0].cities[0].name, 'Kolkata');
assert.equal(indiaRecord.regions[0].cities[0].destinations[0].id, 'museum-of-word-kolkata');
assert.equal(indiaRecord.destinations.some(x => x.id === 'museum-of-word-kolkata'), false, 'Nested records must not be duplicated at country level');
console.log('FRAME World verified discovery tests passed: ' + discoveries.length + ' records.');
