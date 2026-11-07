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
assert.ok(discoveries.length >= 29, 'Expected all 25 UNESCO inscriptions plus museum additions');
const unescoRecords = discoveries.filter(item => item.heritageYear === 2026);
assert.equal(unescoRecords.length, 25, 'The 2026 UNESCO batch must contain exactly 25 new inscriptions');
for (const item of unescoRecords) {
  assert.match(item.url, /^https:\/\/whc\.unesco\.org\/en\/list\/\d+$/, 'Each UNESCO inscription must link to its own official property dossier: ' + item.name);
}
assert.equal(new Set(unescoRecords.map(item => item.url)).size, 25, 'Each UNESCO inscription must have a distinct official dossier URL');
const expectedCategories = { Cultural: 19, Natural: 5, Mixed: 1 };
for (const [category, count] of Object.entries(expectedCategories)) {
  assert.equal(unescoRecords.filter(item => item.unescoCategory === category).length, count, 'Incorrect 2026 UNESCO ' + category + ' count');
}
for (const item of unescoRecords) {
  assert.equal(item.descriptionLicense, 'CC-BY-SA IGO 3.0', 'UNESCO description licence attribution missing: ' + item.name);
}


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
const westBengal = indiaRecord.regions.find(x => x.name === 'West Bengal');
assert.ok(westBengal, 'Expected the verified West Bengal region');
assert.equal(westBengal.cities[0].name, 'Kolkata');
assert.equal(westBengal.cities[0].destinations[0].id, 'museum-of-word-kolkata');
assert.equal(indiaRecord.destinations.some(x => x.id === 'museum-of-word-kolkata'), false, 'Nested records must not be duplicated at country level');
console.log('FRAME World verified discovery tests passed: ' + discoveries.length + ' records.');
