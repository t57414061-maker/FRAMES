/* FRAME World integrated experience — search, discovery, country profiles and saved journeys. */
(function(w,d){
 'use strict';
 var root=d.getElementById('frame-world-app');
 if(!root||!w.FrameWorldCatalog||!w.FrameExperience||!w.FrameCountryExperience)return;
 var catalog=w.FrameWorldCatalog.build(), byId=Object.create(null), byName=Object.create(null);
 catalog.forEach(function(c){byId[c.id]=c;byName[c.name.toLowerCase()]=c;});
 var state={query:'',region:'All regions',saved:read('frame-world-saved'),journey:read('frame-world-journey'),recent:read('frame-world-recent'),compareA:'',compareB:''};
 function read(k){try{return JSON.parse(w.localStorage.getItem(k)||'[]')}catch(e){return[]}}
 function write(k,v){try{w.localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
 function node(tag,cls,txt){var n=d.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=String(txt);return n;}
 function button(label,cls,fn){var b=node('button',cls,label);b.type='button';b.addEventListener('click',fn);return b;}
 function section(id,title,sub){var s=node('section','fw-app-section');s.id=id;s.append(node('h2','fw-app-heading',title));if(sub)s.append(node('p','fw-app-sub',sub));return s;}
 function saveState(){write('frame-world-saved',state.saved);write('frame-world-journey',state.journey);write('frame-world-recent',state.recent);}
 function toggle(list,id){var i=list.indexOf(id);if(i<0)list.push(id);else list.splice(i,1);saveState();renderPanels();}
 function enterCountry(c){if(!c)return;try{var url=new URL(w.location.href);url.searchParams.set('country',c.id);w.history.replaceState({},'',url);}catch(e){}state.recent=[c.id].concat(state.recent.filter(function(x){return x!==c.id})).slice(0,12);saveState();renderProfile(c);}
 function renderProfile(c){
  var profile=d.getElementById('fw-country-profile'),discover=d.getElementById('fw-discovery-view');
  discover.hidden=true;mast.hidden=true;carouselSection.hidden=true;collections.hidden=true;panels.hidden=true;profile.hidden=false;
  var record=w.FrameCountryExperience.fromLegacy(c.legacyRow,w.FRAME_WORLD_RESEARCH,{region:c.region,id:c.id});
  record.regions=[]; /* The source index is flat; never fabricate region/city membership. */
  w.FrameCountryExperience.render(profile,record,{onBack:function(){profile.hidden=true;discover.hidden=false;mast.hidden=false;carouselSection.hidden=false;collections.hidden=false;panels.hidden=false;try{var url=new URL(w.location.href);url.searchParams.delete('country');w.history.replaceState({},'',url);}catch(e){}}});profile.scrollIntoView({behavior:'smooth',block:'start'});if(experience)experience.exit();
  var actions=node('div','fw-country-actions');
  actions.append(button(state.saved.indexOf(c.id)>=0?'★ Saved':'☆ Save country','fw-action',function(){toggle(state.saved,c.id);renderProfile(c);}));
  actions.append(button(state.journey.indexOf(c.id)>=0?'✓ In journey':'+ Add to journey','fw-action',function(){toggle(state.journey,c.id);renderProfile(c);}));
  profile.insertBefore(actions,profile.children[1]||null);
 }
 function openCountry(c){if(!c)return;if(experience){experience.go(c.name);experience.enter();}else enterCountry(c);}
 function appendLicensedImage(parent,entityType,entityId,role,cls){
  var lib=w.FRAME_WORLD_IMAGES;if(!lib||typeof lib.firstApproved!=='function')return;
  var item=lib.firstApproved(entityType,entityId,role)||lib.firstApproved(entityType,entityId,'card');if(!item)return;
  var figure=node('figure',cls||'fw-licensed-image');var img=node('img','',null);img.src=item.assetUrl;img.alt=item.alt;img.loading='lazy';img.decoding='async';figure.appendChild(img);
  if(item.attribution){var credit=node('figcaption','fw-image-credit',item.attribution);figure.appendChild(credit);}parent.appendChild(figure);
 }
 function renderCards(target,items){
  target.textContent='';
  if(!items.length){target.append(node('p','fw-empty','No matching places yet. Try another search or region.'));return;}
  items.forEach(function(c){
   var card=node('article','fw-country-card');
   appendLicensedImage(card,'country',c.id,'card','fw-country-image');
   card.append(node('p','fw-eyebrow',c.region+' · COUNTRY'),node('h3','',c.name),node('p','fw-card-capital',c.capital?'Capital · '+c.capital:'Capital information pending'),node('p','fw-card-count',c.destinations.length+' indexed destinations'));
   card.append(button('Explore country →','fw-open-country',function(){openCountry(c);}));
   card.append(button(state.saved.indexOf(c.id)>=0?'★':'☆','fw-save-country',function(){toggle(state.saved,c.id);renderDiscovery();}));
   target.appendChild(card);
  });
 }
 function renderDiscovery(){
  var target=d.getElementById('fw-country-grid'), q=state.query.toLowerCase();
  var rows=catalog.filter(function(c){return(state.region==='All regions'||c.region===state.region)&&(!q||c.name.toLowerCase().includes(q)||c.capital.toLowerCase().includes(q)||c.destinations.some(function(p){return p.toLowerCase().includes(q)}));});
  renderCards(target,rows);
  d.getElementById('fw-result-count').textContent=rows.length+' of '+catalog.length+' country / area entries';
 }
 function renderPanels(){
  var saved=catalog.filter(function(c){return state.saved.indexOf(c.id)>=0;});
  var savedDestinations=read('frame-world-saved-destinations'),sd=d.getElementById('fw-saved-destinations');
  if(sd){sd.textContent='';if(!savedDestinations.length)sd.append(node('p','fw-empty','No saved destinations yet. Save a place from any country profile.'));savedDestinations.forEach(function(item){var card=node('article','fw-collection-card');card.append(node('h3','',item.name),node('p','',item.country));card.append(button('Remove','fw-action',function(){var next=read('frame-world-saved-destinations').filter(function(x){return x.key!==item.key;});write('frame-world-saved-destinations',next);renderPanels();}));sd.appendChild(card);});}
  var journey=catalog.filter(function(c){return state.journey.indexOf(c.id)>=0;});
  var recent=state.recent.map(function(id){return byId[id]}).filter(Boolean);
  renderCards(d.getElementById('fw-saved-grid'),saved);
  renderCards(d.getElementById('fw-journey-grid'),journey);
  renderCards(d.getElementById('fw-recent-grid'),recent);
  renderCompare();
 }
 function renderCompare(){
  var box=d.getElementById('fw-compare-result'),a=byId[state.compareA],b=byId[state.compareB];box.textContent='';
  if(!a||!b)return;
  var table=d.createElement('div');table.className='fw-compare-grid';
  [a,b].forEach(function(c){var cell=node('article','fw-compare-card');cell.append(node('h3','',c.name),node('p','',c.region),node('p','', 'Capital · '+(c.capital||'Not listed')),node('p','',c.destinations.length+' destinations indexed'));table.appendChild(cell);});
  box.appendChild(table);
 }
 function renderCollections(){
  var target=d.getElementById('fw-collection-grid');target.textContent='';
  (w.FRAME_WORLD_DATA.regions||[]).concat([{name:'Europe',countries:w.FRAME_WORLD_DATA.europe||[]}]).forEach(function(r){
   var card=node('article','fw-collection-card');card.append(node('p','fw-eyebrow','FRAME COLLECTION'),node('h3','',r.name),node('p','',((r.countries||[]).length)+' country / area entries'));
   card.append(button('Browse collection →','fw-open-country',function(){state.region=r.name;var sel=d.getElementById('fw-region-filter');sel.value=r.name;state.query='';d.getElementById('fw-global-search').value='';renderDiscovery();d.getElementById('fw-discover').scrollIntoView({behavior:'smooth'});}));
   target.appendChild(card);
  });
 }
 root.textContent='';
 var shell=node('div','fw-app-shell');
 var mast=node('div','fw-app-mast');
 mast.append(node('p','fw-eyebrow','THE WORLD, OPENED BY FRAME'),node('h1','fw-app-title','Every perspective. Every story.'),node('p','fw-app-lead','A growing atlas of countries, cultures and places. Explore what is documented, and see clearly where research is still underway.'));
 var search=node('div','fw-searchbar'),input=node('input','fw-global-search'),region=node('select','fw-region-filter');
 input.id='fw-global-search';input.type='search';input.placeholder='Search countries, capitals and destinations…';input.setAttribute('aria-label','Search the world atlas');
 region.id='fw-region-filter';region.appendChild(new Option('All regions','All regions'));
 Array.from(new Set(catalog.map(function(c){return c.region}))).sort().forEach(function(x){region.appendChild(new Option(x,x));});
 search.append(input,region);mast.appendChild(search);
 var randomBtn=button('Surprise me ↗','fw-open-country',function(){openCountry(catalog[Math.floor(Math.random()*catalog.length)]);});randomBtn.id='fw-world-random';mast.appendChild(randomBtn);
 var count=node('p','fw-result-count','');count.id='fw-result-count';mast.appendChild(count);shell.appendChild(mast);
 var carouselSection=section('fw-carousel','Explore the world','Select a country in the cinematic carousel. Use search to jump directly to any indexed country.');
 var carouselRoot=node('div','fw-carousel-root');carouselRoot.id='fwx-carousel-root';carouselSection.appendChild(carouselRoot);shell.appendChild(carouselSection);
 var discover=section('fw-discover','Discover countries','Browse the country index or search by country, capital or destination.');discover.id='fw-discovery-view';
 var grid=node('div','fw-country-grid');grid.id='fw-country-grid';discover.appendChild(grid);shell.appendChild(discover);
 var profile=node('div','fw-country-profile');profile.id='fw-country-profile';profile.hidden=true;shell.appendChild(profile);
 var collections=section('fw-collections','FRAME Collections','Explore the atlas by world region.');var cg=node('div','fw-collection-grid');cg.id='fw-collection-grid';collections.appendChild(cg);shell.appendChild(collections);
 var panels=section('fw-your-world','Your World','Saved countries, a personal journey board and recently explored places are stored on this device.');panels.id='fw-your-world';
 [['Saved countries','fw-saved-grid'],['Journey board','fw-journey-grid'],['Recently explored','fw-recent-grid']].forEach(function(pair){var h=node('h3','fw-panel-title',pair[0]),g=node('div','fw-country-grid');g.id=pair[1];panels.append(h,g);});
 var savedDestHeading=node('h3','fw-panel-title','Saved destinations');var savedDestGrid=node('div','fw-collection-grid');savedDestGrid.id='fw-saved-destinations';panels.append(savedDestHeading,savedDestGrid);
 var compare=node('div','fw-compare-tools');compare.append(node('h3','fw-panel-title','Compare countries'));
 var ca=node('select','fw-compare-select'),cb=node('select','fw-compare-select');ca.append(new Option('Choose first country',''));cb.append(new Option('Choose second country',''));
 catalog.forEach(function(c){ca.append(new Option(c.name,c.id));cb.append(new Option(c.name,c.id));});
 ca.addEventListener('change',function(){state.compareA=ca.value;renderCompare();});cb.addEventListener('change',function(){state.compareB=cb.value;renderCompare();});
 compare.append(ca,cb);var cr=node('div','');cr.id='fw-compare-result';compare.append(cr);panels.append(compare);shell.append(panels);
 var note=node('p','fw-data-note','Research integrity: this atlas is a growing index, not a complete guide to every country. Country destination lists may be broad but remain flat until verified geographic relationships are available. Opening hours, prices, access and safety details are not guessed.');shell.append(note);
 root.appendChild(shell);
 input.addEventListener('input',function(){state.query=input.value;renderDiscovery();});
 region.addEventListener('change',function(){state.region=region.value;renderDiscovery();});
 renderCollections();renderDiscovery();renderPanels();
 var requestedCountry='';try{requestedCountry=new URLSearchParams(w.location.search).get('country')||'';}catch(e){}
 var experience=w.FrameExperience.init({root:'#fwx-carousel-root',intro:!requestedCountry,countries:catalog.map(function(c){return {id:c.id,name:c.name,capital:c.capital,accent:'#c9a96e'};}),introOnce:true,onEnter:function(c){enterCountry(byId[c.id]||byName[c.name.toLowerCase()]);experience.exit();}});
 if(!experience)carouselRoot.append(node('p','fw-empty','The carousel could not start. Use the country index below.'));
 if(requestedCountry&&byId[requestedCountry])openCountry(byId[requestedCountry]);
 d.addEventListener('frameworld:saved-destinations-changed',renderPanels);
 d.getElementById('fw-world-random').addEventListener('click',function(){openCountry(catalog[Math.floor(Math.random()*catalog.length)]);});
})(window,document);
