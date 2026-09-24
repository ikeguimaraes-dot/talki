import {test} from 'node:test';
import assert from 'node:assert/strict';
import {agendaDay,dayInstant,eventsOnDay,positionEvents,shiftDay,validMeetingLink,weekDays} from '../src/lib/agenda.ts';
const event=(id,start,end,allDay=false)=>({id,inicio:dayInstant('2026-09-24',start),fim:dayInstant('2026-09-24',end),dia_inteiro:allDay});
test('São Paulo boundaries and month/year navigation',()=>{
 assert.equal(agendaDay('2026-09-24T02:59:00Z'),'2026-09-23');
 assert.equal(dayInstant('2026-09-24'),'2026-09-24T03:00:00.000Z');
 assert.equal(shiftDay('2026-12-31',1),'2027-01-01');
 assert.deepEqual(weekDays('2026-09-24'),['2026-09-20','2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26']);
});
test('all-day events have an exclusive end; timed events split at midnight',()=>{
 const all={id:'all',inicio:dayInstant('2026-09-24'),fim:dayInstant('2026-09-26'),dia_inteiro:true};
 assert.equal(eventsOnDay([all],'2026-09-25').length,1);
 assert.equal(eventsOnDay([all],'2026-09-26').length,0);
 const overnight={...all,id:'night',inicio:dayInstant('2026-09-24','23:00'),fim:dayInstant('2026-09-25','01:00'),dia_inteiro:false};
 assert.equal(positionEvents([overnight],'2026-09-24')[0].end,1440);
 assert.equal(positionEvents([overnight],'2026-09-25')[0].start,0);
 assert.equal(positionEvents([overnight],'2026-09-25')[0].end,60);
});
test('overlap groups get independent columns and touching events reuse space',()=>{
 const result=positionEvents([event('a','09:00','11:00'),event('b','09:30','10:00'),event('c','10:00','12:00'),event('d','12:00','13:00')],'2026-09-24');
 assert.deepEqual(result.map(p=>[p.event.id,p.column,p.columns]),[['a',0,2],['b',1,2],['c',1,2],['d',0,1]]);
 assert.equal(positionEvents(Array.from({length:5},(_,i)=>event(String(i),'09:00','10:00')),'2026-09-24')[0].columns,5);
});
test('meeting links accept only web URLs',()=>{
 assert.equal(validMeetingLink('https://meet.google.com/test'),true);
 assert.equal(validMeetingLink(''),true);
 for(const value of ['javascript:alert(1)','data:text/html,test','not a link'])assert.equal(validMeetingLink(value),false);
});
