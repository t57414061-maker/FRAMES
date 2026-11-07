/* FRAME World country catalog adapter.
 * Converts the maintained legacy index into normalized records without inventing facts.
 */
(function(w){
 'use strict';
 function slug(s){return String(s||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
 function build(data,research){
  data=data||w.FRAME_WORLD_DATA||{}; research=research||w.FRAME_WORLD_RESEARCH||{};
  var groups=[{name:'Europe',countries:data.europe||[]}].concat(data.regions||[]);
  var seen=Object.create(null), records=[];
  groups.forEach(function(group){
   (group.countries||[]).forEach(function(row){
    if(!Array.isArray(row)||!row[0])return;
    var key=slug(row[0]); if(seen[key])return; seen[key]=true;
    var country={id:key,name:row[0],capital:row[1]||'',region:group.name||'Unassigned',
      destinationNames:row.slice(2),legacyRow:row};
    country.destinations=country.destinationNames.map(function(name){
      var r=research[name]||{};
      return {id:slug(name),name:name,summary:r.summary||'',explore:r.explore||'',
       photography:r.photo||'',visitorInfo:r.visit||'',status:r.status||'Research pending',
       source:r.url?{name:r.source||'Verified reference',url:r.url}:null};
    });
    records.push(country);
   });
  });
  return records;
 }
 w.FrameWorldCatalog={build:build,slug:slug};
})(window);
