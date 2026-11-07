import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { actionText } from '../src/i18n/ActionLabels.js';
import { GARDEN_TEXT } from '../src/ui/gardenText.js';
test('garden tool and plot actions have meanings instead of falling back to Turkish alone',()=>{
 for(const [tr,en]of [['Çapayı al','Take the hoe'],['Sulama kabını al','Take the watering can'],['Aracı yerine bırak','Put the tool back'],['Çapala · 2. toprak','Hoe plot 2'],['Tohum ek · 1. toprak','Sow a seed in plot 1'],['Sula · 3. toprak','Water plot 3']])assert.equal(actionText(tr).main,en);
});
test('all supported meaning languages translate each garden guidance key and preserve plot numbers',()=>{
 for(const lang of ['ar','ur','hi','es','fr','id']){
  const dictionary=JSON.parse(readFileSync(new URL(`../assets/i18n/${lang}.json`,import.meta.url),'utf8'));
  for(const {en}of Object.values(GARDEN_TEXT)){assert.ok(dictionary[en],`${lang}: ${en}`);if(en.includes('{n}'))assert.ok(dictionary[en].includes('{n}'));}
 }
});
