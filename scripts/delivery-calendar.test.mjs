import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDays,shiftCalendar,localDay,dueRows,isOverdue,assignedPeople} from '../src/lib/delivery-calendar.ts';
test('calendar starts Monday, spans month/year and uses São Paulo day',()=>{
 assert.equal(localDay('2026-11-25T01:30:00Z'),'2026-11-24');
 assert.deepEqual(calendarDays('2026-11-24','week'),['2026-11-23','2026-11-24','2026-11-25','2026-11-26','2026-11-27','2026-11-28','2026-11-29']);
 assert.equal(calendarDays('2026-11-24','month')[0],'2026-10-26');
 assert.equal(shiftCalendar('2026-12-31','month',1),'2027-01-01');
});
test('calendar counts only actual due dates and overdue actionable states',()=>{
 const e={id:'e',vence_em:'2026-11-25T01:30:00Z',status:'pendente'};
 assert.equal(dueRows([e],'2026-11-24').length,1);assert.equal(dueRows([e],'2026-11-25').length,0);
 assert.equal(isOverdue(e,new Date('2026-11-25T02:00:00Z')),true);
 for(const status of ['enviada','concluida','cancelada'])assert.equal(isOverdue({...e,status},new Date('2026-11-25T02:00:00Z')),false);
});
test('people are grouped by group and authenticated ID, not ambiguous names',()=>{
 const e={id:'e',group_id:'g',agenda_id:'a',responsavel:'u',responsavel_nome:'João'};
 const people=assignedPeople([e,{...e,id:'2',responsavel:'v'},{...e,id:'3',group_id:'other'}],[{id:'a',group_id:'g',catalogo_id:'c'}],[{group_id:'g',id:'c',documento:{area:'Financeiro',areaId:'fin'}}]);
 assert.equal(people.length,3);
 assert.deepEqual([...people.find(p=>p.groupId==='g'&&p.userId==='u').areas],['Financeiro']);
 assert.equal(people.find(p=>p.groupId==='other').areas.size,0);
});
