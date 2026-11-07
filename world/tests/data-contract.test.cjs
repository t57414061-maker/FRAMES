const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { window: {}, URL };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('world/catalog.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('world/schema.js', 'utf8'), sandbox);

const sample = {
  europe: [['Testland', 'Example City', 'Old Town', 'Blue Lake']],
  regions: [{ name: 'Asia', countries: [['Sample Republic', 'Capital', 'Mountain Park']] }]
};
const research = {
  'Old Town': { summary: 'A verified sample summary', source: 'Official tourism office', url: 'https://example.org/old-town' }
};
const rows = sandbox.window.FrameWorldCatalog.build(sample, research);
assert.equal(rows.length, 2);
assert.equal(rows[0].name, 'Testland');
assert.equal(rows[0].region, 'Europe');
assert.equal(rows[0].destinations.length, 2);
assert.equal(rows[0].destinations[0].summary, 'A verified sample summary');
assert.equal(rows[0].destinations[1].summary, '');

const valid = sandbox.window.FrameWorldSchema.validateCountry({
  id: 'testland',
  name: 'Testland',
  source: { name: 'Official source', url: 'https://example.org' },
  regions: [{
    id: 'north',
    name: 'North',
    cities: [{
      id: 'example-city',
      name: 'Example City',
      destinations: [{ id: 'old-town', name: 'Old Town', source: { name: 'Official source', url: 'https://example.org/old-town' } }]
    }]
  }]
});
assert.equal(valid.valid, true, valid.errors.join('; '));

const invalid = sandbox.window.FrameWorldSchema.validateCountry({
  id: 'bad-country',
  name: 'Bad Country',
  source: { name: 'Unsecured source', url: 'http://example.org' }
});
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.some(error => error.includes('HTTPS')));
console.log('FRAME World catalog and schema tests passed.');


// Image registry contract: incomplete and unapproved records must never publish.
vm.runInContext(fs.readFileSync('world/images.js', 'utf8'), sandbox);
const imageLibrary = sandbox.window.FRAME_WORLD_IMAGES;
assert.equal(imageLibrary.items.length, 0, 'No image should be approved by default');
assert.equal(imageLibrary.firstApproved('country', 'testland', 'hero'), null);
const validImage = {
  id: 'test-image', entityType: 'country', entityId: 'testland', role: 'hero',
  assetUrl: '/world/images/testland/hero.jpg', sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
  sourceName: 'Wikimedia Commons', title: 'Example landscape', creator: 'Example Photographer',
  licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'Photo: Example Photographer / CC BY 4.0', alt: 'A mountain landscape in Testland',
  verifiedAt: '2026-11-07', status: 'approved'
};
assert.equal(imageLibrary.validateRecord(validImage).valid, true);
assert.equal(imageLibrary.validateRecord({...validImage, status: 'pending'}).valid, false);
assert.equal(imageLibrary.validateRecord({...validImage, sourcePageUrl: 'javascript:alert(1)'}).valid, false);
assert.equal(imageLibrary.validateRecord({...validImage, licenseUrl: 'http://example.org/license'}).valid, false);
assert.equal(imageLibrary.validateRecord({...validImage, alt: ''}).valid, false);
console.log('FRAME World image registry tests passed.');
