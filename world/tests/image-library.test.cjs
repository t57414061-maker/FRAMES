const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = { window: {}, URL };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('world/images.js', 'utf8'), sandbox);

const library = sandbox.window.FRAME_WORLD_IMAGES;
assert.equal(library.items.length, 0, 'No image should be approved by default');
assert.equal(library.firstApproved('country', 'testland', 'hero'), null);

const approved = {
  id: 'test-image', entityType: 'country', entityId: 'testland', role: 'hero',
  assetUrl: '/world/images/testland/hero.jpg',
  sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
  sourceName: 'Wikimedia Commons', title: 'Example landscape', creator: 'Example Photographer',
  licenseName: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'Photo: Example Photographer / CC BY 4.0', alt: 'A mountain landscape in Testland',
  verifiedAt: '2026-11-07', status: 'approved'
};
assert.equal(library.validateRecord(approved).valid, true);
assert.equal(library.validateRecord({...approved, status: 'pending'}).valid, false);
assert.equal(library.validateRecord({...approved, assetUrl: 'javascript:alert(1)'}).valid, false);
assert.equal(library.validateRecord({...approved, sourcePageUrl: 'javascript:alert(1)'}).valid, false);
assert.equal(library.validateRecord({...approved, licenseUrl: 'http://example.org/license'}).valid, false);
assert.equal(library.validateRecord({...approved, alt: ''}).valid, false);
library.items.push(approved);
assert.equal(library.firstApproved('country', 'testland', 'hero').id, 'test-image');
assert.equal(library.firstApproved('country', 'testland', 'card'), null);
assert.equal(library.firstApproved('destination', 'testland', 'hero'), null);
console.log('FRAME World image licensing tests passed.');
