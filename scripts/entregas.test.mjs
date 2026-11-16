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
