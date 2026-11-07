/* FRAME World country catalog adapter.
 * Converts the maintained index and verified discovery additions into normalized records.
 * Geographic relationships are attached only where an official source confirms them.
 */
(function(w){
 'use strict';
 function slug(s){return String(s||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
 function build(data,research){
  data=data||w.FRAME_WORLD_DATA||{}; research=Object.assign({},research||w.FRAME_WORLD_RESEARCH||{});
  var groups=[{name:'Europe',countries:data.europe||[]}].concat(data.regions||[]);
  var seen=Object.create(null), records=[], discoveries=Array.isArray(w.FRAME_WORLD_VERIFIED_DISCOVERIES)?w.FRAME_WORLD_VERIFIED_DISCOVERIES:[];
  groups.forEach(function(group){
   (group.countries||[]).forEach(function(row){
    if(!Array.isArray(row)||!row[0])return;
    var key=slug(row[0]); if(seen[key])return; seen[key]=true;
    var country={id:key,name:row[0],capital:row[1]||'',region:group.name||'Unassigned',destinationNames:row.slice(2),legacyRow:row};
    records.push(country);
   });
  });
  discoveries.forEach(function(item){
   if(!item||!item.country||!item.name)return;
   var key=slug(item.country),country=records.find(function(c){return c.id===key;});
   if(!country){
    country={id:key,name:item.country,capital:'',region:item.region||'Unassigned',destinationNames:[],legacyRow:[item.country,'']};
    records.push(country);seen[key]=true;
   }
   if(country.destinationNames.indexOf(item.name)<0){country.destinationNames.push(item.name);country.legacyRow.push(item.name);}
   research[item.name]={status:item.status||'Source checked',summary:item.summary||'',explore:item.explore||'',photo:item.photo||'',visit:item.visit||'',source:item.source||'Official source',url:item.url||''};
  });
  w.FRAME_WORLD_RESEARCH=research;
  records.forEach(function(country){
   country.destinations=country.destinationNames.map(function(name){
    var r=research[name]||{},verified=discoveries.find(function(x){return x&&x.name===name;});
    return {id:slug(name),name:name,summary:r.summary||'',explore:r.explore||'',
     photography:r.photo||'',visitorInfo:r.visit||'',status:r.status||'Research pending',
     source:r.url?{name:r.source||'Verified reference',url:r.url}:null,
     geography:verified?{administrativeArea:verified.administrativeArea||'',district:verified.district||'',city:verified.city||'',locality:verified.locality||''}:null,
     category:verified?verified.category||'':'',verifiedAt:verified?verified.verifiedAt||'':'',
     openingStatus:verified?verified.status||'':''};
   });
  });
  return records;
 }
 function discovery(id){var items=Array.isArray(w.FRAME_WORLD_VERIFIED_DISCOVERIES)?w.FRAME_WORLD_VERIFIED_DISCOVERIES:[];return items.find(function(x){return x.id===id||slug(x.name)===id;})||null;}
 w.FrameWorldCatalog={build:build,slug:slug,discovery:discovery};
})(window);
