/* FRAME World structured data contract and validation helpers.
 * This module validates future country → region → city → destination records.
 * It intentionally does not infer missing geography or factual content.
 */
(function(w){
 'use strict';
 function text(v){return typeof v==='string'&&v.trim().length>0;}
 function secureSource(s){if(!s||!text(s.url)||!text(s.name))return false;try{return new URL(s.url).protocol==='https:';}catch(e){return false;}}
 function validateDestination(d,path){
  var errors=[];
  if(!d||!text(d.id))errors.push(path+': missing stable id');
  if(!d||!text(d.name))errors.push(path+': missing name');
  if(d&&d.source&&!secureSource(d.source))errors.push(path+': source must have a name and HTTPS URL');
  if(d&&d.images&&d.images.length)errors.push(path+': images must be resolved through the approved image registry, not inline URLs');
  return errors;
 }
 function validateCity(city,path){
  var errors=[];
  if(!city||!text(city.id))errors.push(path+': missing stable id');
  if(!city||!text(city.name))errors.push(path+': missing name');
  (city&&Array.isArray(city.destinations)?city.destinations:[]).forEach(function(x,i){errors=errors.concat(validateDestination(x,path+'.destinations['+i+']'));});
  return errors;
 }
 function validateRegion(region,path){
  var errors=[];
  if(!region||!text(region.id))errors.push(path+': missing stable id');
  if(!region||!text(region.name))errors.push(path+': missing name');
  (region&&Array.isArray(region.cities)?region.cities:[]).forEach(function(x,i){errors=errors.concat(validateCity(x,path+'.cities['+i+']'));});
  (region&&Array.isArray(region.destinations)?region.destinations:[]).forEach(function(x,i){errors=errors.concat(validateDestination(x,path+'.destinations['+i+']'));});
  return errors;
 }
 function validateCountry(country){
  var errors=[];
  if(!country||!text(country.id))errors.push('country: missing stable id');
  if(!country||!text(country.name))errors.push('country: missing name');
  if(country&&country.source&&!secureSource(country.source))errors.push('country: source must have a name and HTTPS URL');
  (country&&Array.isArray(country.regions)?country.regions:[]).forEach(function(x,i){errors=errors.concat(validateRegion(x,'regions['+i+']'));});
  (country&&Array.isArray(country.destinations)?country.destinations:[]).forEach(function(x,i){errors=errors.concat(validateDestination(x,'destinations['+i+']'));});
  return {valid:errors.length===0,errors:errors};
 }
 w.FrameWorldSchema={validateCountry:validateCountry,validateRegion:validateRegion,validateCity:validateCity,validateDestination:validateDestination};
})(window);
