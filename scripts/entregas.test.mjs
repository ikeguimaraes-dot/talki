import test from 'node:test';
import assert from 'node:assert/strict';
import {filterCatalog,filterExecutions,canSend,canReview,checklistComplete} from '../src/lib/entregas.ts';
const e={id:'e',titulo:'Conciliação bancária',contexto:'Meet · noite',responsavel:'executor',gestor:'gestor',responsavel_nome:'Pessoa',status:'pendente',checklist:['Conferir banco','Conferir taxas'],checklist_respostas:[]};
test('executor, validator and lifecycle eligibility stay distinct',()=>{
 assert.equal(canSend(e,'executor'),true);assert.equal(canSend(e,'gestor'),false);assert.equal(canReview(e,'gestor'),false);
 assert.equal(canReview({...e,status:'enviada'},'gestor'),true);assert.equal(canReview({...e,status:'enviada'},'executor'),false);
 for(const status of ['enviada','concluida','cancelada'])assert.equal(canSend({...e,status},'executor'),false);
 assert.equal(checklistComplete({...e,checklist_respostas:['Conferir banco','Invalid']}),false);
 assert.equal(checklistComplete({...e,checklist_respostas:e.checklist}),true);
});
test('scope and search keep assigned work and validation queues separate',()=>{
 const rows=[e,{...e,id:'other',responsavel:'other',gestor:'another'},{...e,id:'done',status:'concluida'}];
 assert.deepEqual(filterExecutions(rows,'executor','minhas','abertas','conciliacao').map(x=>x.id),['e']);
 assert.deepEqual(filterExecutions(rows,'gestor','gestor','todas','meet').map(x=>x.id),['e','done']);
 assert.equal(filterExecutions(rows,'outsider','minhas','todas','').length,0);
});
test('catalog combines area, cadence and accent-insensitive checklist search',()=>{
 const doc={id:'one',title:'Fechar caixa',area:'Financeiro',areaId:'financeiro',frequency:'diaria',checklist:['Conciliação bancária']};
 const rows=[{documento:doc},{documento:{...doc,id:'two',frequency:'mensal'}},{documento:{...doc,id:'three',areaId:'compras'}}];
 assert.equal(filterCatalog(rows,'financeiro','diaria','conciliacao').length,1);
 assert.equal(filterCatalog(rows,'','mensal','').length,1);
 assert.equal(filterCatalog(rows,'financeiro','','inexistente').length,0);
});

test('desktop queue excludes other users, closed and future deliveries by default',async()=>{
 const {desktopDeliveryQueue}=await import('../src/lib/entregas.ts');
 const base={...e,vence_em:'2026-11-23T15:00:00Z'};
 const rows=[base,{...base,id:'future',vence_em:'2026-11-24T15:00:00Z'},{...base,id:'other',responsavel:'other'},{...base,id:'closed',status:'concluida'},{...base,id:'review',status:'enviada'}];
 const now=new Date('2026-11-23T16:00:00Z');
 assert.deepEqual(desktopDeliveryQueue(rows,'executor',now,false).map(x=>x.id),['e','review']);
 assert.deepEqual(desktopDeliveryQueue(rows,'executor',now,true).map(x=>x.id),['e','future','review']);
});
test('responsibility cards preserve unit, shared ownership and tenant scope without duplicating templates inside a card',async()=>{
 const {responsibilityCards}=await import('../src/lib/entregas.ts');
 const row={group_id:'g1',id:'a',documento:{id:'a',area:'Operação',areaId:'op',owner:'Meet: Ana / Bia · Match: VAGO'}};
 const cards=responsibilityCards([row,row,{...row,group_id:'g2'},{...row,id:'b',documento:{...row.documento,owner:'Camilo (coordenação)'}}]);
 assert.equal(cards.length,7);
 assert.equal(cards.find(c=>c.person==='Ana'&&c.groupId==='g1').templates.length,1);
 assert.equal(cards.find(c=>c.person==='VAGO').context,'Match');
 assert.equal(cards.find(c=>c.person==='Camilo').templates.length,1);
});
