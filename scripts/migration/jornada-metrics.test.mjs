import { test } from 'node:test';
import assert from 'node:assert/strict';
import { secondsInRange,dayStart,weekdays,spDay,scoreDelta } from '../../src/lib/jornada-metrics.ts';
test('divides a midnight crossing in São Paulo without duplicating seconds',()=>{
 const r={inicio:'2026-09-16T02:00:00Z',fim:'2026-09-16T04:00:00Z'};
 assert.equal(secondsInRange(r,dayStart('2026-09-15'),dayStart('2026-09-16')),3600);
 assert.equal(secondsInRange(r,dayStart('2026-09-16'),dayStart('2026-09-17')),3600);
 assert.equal(spDay(r.inicio),'2026-09-15');
});
test('open records are provisional, and end markers contribute zero',()=>{
 const r={inicio:'2026-09-16T12:00:00Z',fim:null};
 assert.equal(secondsInRange(r,dayStart('2026-09-16'),dayStart('2026-09-17')),0);
 assert.equal(secondsInRange(r,dayStart('2026-09-16'),dayStart('2026-09-17'),'2026-09-16T13:00:00Z'),3600);
 assert.equal(secondsInRange({...r,fim:r.inicio},dayStart('2026-09-16'),dayStart('2026-09-17')),0);
});
test('capacity counts actual weekdays, and points match SQL bands',()=>{
 assert.equal(weekdays('2026-09-19','2026-09-20'),0);
 assert.equal(weekdays('2026-09-14','2026-09-20'),5);
 assert.deepEqual([49,50,60,70,80,90,100].map(scoreDelta),[-5,-2,-1,1,2,3,5]);
});
