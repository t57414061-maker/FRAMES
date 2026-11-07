/* FRAME World — Phase 4 country experience
 * Standalone renderer and legacy-data adapter. No backend or page wiring.
 * All user-facing values are inserted as text, never as HTML.
 */
(function (w, d) {
  'use strict';

  function el(tag, cls, value) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (value != null) n.textContent = String(value);
    return n;
  }
  function safeSource(source) {
    if (!source || !source.url) return null;
    try {
      var u = new URL(source.url, w.location.href);
      return u.protocol === 'https:' ? u.href : null;
    } catch (e) { return null; }
  }
  function sourceLink(source) {
    var href = safeSource(source);
    if (!href) return null;
    var a = el('a', 'fwc-source', source.name || 'Open verified source');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }
  function addField(parent, label, value) {
    if (!value) return;
    var box = el('div', 'fwc-field');
    box.append(el('h4', '', label), el('p', '', value));
    parent.appendChild(box);
  }
  function destinationCard(item) {
    var card = el('article', 'fwc-destination');
    card.appendChild(el('p', 'fwc-eyebrow', item.category || 'DESTINATION'));
    card.appendChild(el('h4', 'fwc-destination__title', item.name));
    if (item.summary) card.appendChild(el('p', 'fwc-destination__summary', item.summary));
    else card.appendChild(el('p', 'fwc-pending', 'Research in progress · detailed profile not yet verified'));
    var fields = el('div', 'fwc-fields');
    addField(fields, 'History & significance', item.history || item.significance);
    addField(fields, 'Explore', item.explore);
    addField(fields, 'Photography notes', item.photography);
    addField(fields, 'Best time to visit', item.bestTimeToVisit);
    addField(fields, 'Visitor information', item.visitorInfo);
    if (fields.childNodes.length) card.appendChild(fields);
    var link = sourceLink(item.source);
    if (link) card.appendChild(link);
    return card;
  }
  function section(title, description) {
    var s = el('section', 'fwc-section');
    s.append(el('h3', 'fwc-section__title', title));
    if (description) s.append(el('p', 'fwc-section__intro', description));
    return s;
  }
  function renderDestinations(parent, destinations) {
    if (!destinations || !destinations.length) return;
    var grid = el('div', 'fwc-destinations');
    destinations.forEach(function (item) { grid.appendChild(destinationCard(item)); });
    parent.appendChild(grid);
  }
  function renderRegion(parent, region) {
    var block = section(region.name || 'Region');
    (region.cities || []).forEach(function (city) {
      var cityBlock = el('div', 'fwc-city');
      cityBlock.appendChild(el('h4', 'fwc-city__title', city.name || 'City'));
      renderDestinations(cityBlock, city.destinations || []);
      block.appendChild(cityBlock);
    });
    renderDestinations(block, region.destinations || []);
    parent.appendChild(block);
  }
  function render(root, country, options) {
    options = options || {};
    if (!root || !country || !country.name) return false;
    root.textContent = '';
    root.classList.add('fwc-root');
    var header = el('header', 'fwc-header');
    var back = el('button', 'fwc-back', options.backLabel || '← Back to countries');
    back.type = 'button';
    back.addEventListener('click', function () {
      if (typeof options.onBack === 'function') options.onBack(country);
    });
    header.appendChild(back);
    header.appendChild(el('p', 'fwc-eyebrow', country.region || 'FRAME WORLD'));
    root.appendChild(header);

    var hero = el('section', 'fwc-hero');
    if (country.heroImage) hero.style.backgroundImage = 'linear-gradient(90deg,rgba(0,0,0,.86),rgba(0,0,0,.35)),url("' + String(country.heroImage).replace(/["\\]/g, '') + '")';
    hero.append(el('p', 'fwc-eyebrow', country.officialName || 'COUNTRY PROFILE'));
    hero.append(el('h1', 'fwc-title', country.name));
    if (country.capital) hero.append(el('p', 'fwc-capital', 'Capital · ' + country.capital));
    if (country.summary) hero.append(el('p', 'fwc-summary', country.summary));
    root.appendChild(hero);

    var facts = el('div', 'fwc-facts');
    addField(facts, 'Official name', country.officialName);
    addField(facts, 'Capital', country.capital);
    addField(facts, 'Best time to visit', country.bestTimeToVisit);
    addField(facts, 'Visitor information', country.visitorInfo);
    if (facts.childNodes.length) root.appendChild(facts);

    if (country.history || country.significance) {
      var context = section('History & cultural context');
      context.append(el('p', 'fwc-context', country.history || country.significance));
      root.appendChild(context);
    }
    (country.regions || []).forEach(function (region) { renderRegion(root, region); });
    if (country.destinations && country.destinations.length) {
      var destinationSection = section('Explore destinations', 'A growing index of places to discover. Profiles appear as reliable sources are verified.');
      renderDestinations(destinationSection, country.destinations);
      root.appendChild(destinationSection);
    }
    if (!country.regions?.length && !country.destinations?.length) {
      root.appendChild(el('p', 'fwc-pending', 'Destination research for this country has not been added yet.'));
    }
    var source = sourceLink(country.source);
    if (source) {
      var footer = el('footer', 'fwc-footer');
      footer.append(el('p', 'fwc-eyebrow', 'COUNTRY REFERENCE'), source);
      root.appendChild(footer);
    }
    return true;
  }

  /* Adapts the current [country, capital, destination…] rows without inventing detail. */
  function fromLegacy(row, researchIndex, meta) {
    if (!Array.isArray(row) || !row[0]) return null;
    researchIndex = researchIndex || {};
    meta = meta || {};
    var destinations = row.slice(2).map(function (name) {
      var r = researchIndex[name] || {};
      return {
        id: name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        name: name,
        summary: r.summary || '',
        explore: r.explore || '',
        photography: r.photo || '',
        visitorInfo: r.visit || '',
        source: r.url ? { name: r.source || 'Verified source', url: r.url } : null,
        researchStatus: r.status || 'Research pending'
      };
    });
    return {
      id: meta.id || row[0].toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      isoCode: meta.isoCode || '',
      name: row[0],
      capital: row[1] || '',
      region: meta.region || '',
      summary: meta.summary || '',
      destinations: destinations
    };
  }

  w.FrameCountryExperience = { render: render, fromLegacy: fromLegacy };
})(window, document);
