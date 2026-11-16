import { jsPDF } from 'jspdf';
import type { Categoria, Registro } from '@/lib/jornada';
import { clock, dayStart, addDays, secondsInRange, spDay } from '@/lib/jornada-metrics';

interface JornadaPdfOptions {
 day: string;
 personName: string;
 records: Registro[];
 categories: Categoria[];
 now?: Date;
}

const blue: [number,number,number]=[37,99,235];
const ink: [number,number,number]=[24,32,48];
const muted: [number,number,number]=[93,105,122];

function dateLabel(day:string) {
 return new Intl.DateTimeFormat('pt-BR',{dateStyle:'full',timeZone:'America/Sao_Paulo'}).format(new Date(`${day}T12:00:00-03:00`));
}
function timeLabel(instant:string) {
 return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(instant));
}

export function createJornadaPdf({day,personName,records,categories,now=new Date()}:JornadaPdfOptions) {
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
 const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
 const margin=16,contentWidth=width-margin*2,start=dayStart(day),end=dayStart(addDays(day,1)),nowIso=now.toISOString();
 const categoryName=new Map(categories.map(category=>[category.id,category.nome]));
 const visible=records.filter(record=>secondsInRange(record,start,end,nowIso)>0 || spDay(record.inicio)===day);
 const total=visible.reduce((sum,record)=>sum+secondsInRange(record,start,end,nowIso),0);
 let y=18;

 const pageHeader=()=>{
  doc.setFillColor(...blue);doc.rect(0,0,width,5,'F');
  doc.setTextColor(...ink);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('Jornada diária',margin,18);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...muted);doc.text('TALKI',width-margin,17,{align:'right'});
  y=28;
 };
 const ensureSpace=(needed:number)=>{if(y+needed>height-18){doc.addPage();pageHeader();}};
 pageHeader();

 doc.setFillColor(243,246,252);doc.roundedRect(margin,y,contentWidth,31,3,3,'F');
 doc.setTextColor(...muted);doc.setFontSize(9);doc.text('DATA',margin+5,y+7);doc.text('TOTAL REGISTRADO',width-margin-5,y+7,{align:'right'});
 doc.setTextColor(...ink);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(dateLabel(day),margin+5,y+14);
 doc.setFontSize(15);doc.text(clock(total),width-margin-5,y+16,{align:'right'});
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...muted);doc.text(`Colaborador: ${personName || 'Usuário do Talki'}`,margin+5,y+24);
 y+=40;

 doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(...ink);doc.text('Atividades do dia',margin,y);y+=7;
 if(!visible.length){
  doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(...muted);doc.text('Nenhuma atividade registrada nesta data.',margin,y+5);y+=15;
 }
 visible.forEach((record,index)=>{
  const duration=secondsInRange(record,start,end,nowIso);
  const details=[categoryName.get(record.categoria_id) || 'Sem categoria',record.projeto_nome,record.tarefa_titulo].filter(Boolean).join('  |  ');
  const descriptionLines=doc.splitTextToSize(record.descricao,contentWidth-75) as string[];
  const detailLines=doc.splitTextToSize(details,contentWidth-10) as string[];
  const participants=record.participantes ? doc.splitTextToSize(`Participantes: ${record.participantes}`,contentWidth-10) as string[] : [];
  const cardHeight=18+descriptionLines.length*5+detailLines.length*4+participants.length*4;
  ensureSpace(cardHeight+4);
  doc.setDrawColor(222,228,238);doc.setFillColor(252,253,255);doc.roundedRect(margin,y,contentWidth,cardHeight,2,2,'FD');
  doc.setTextColor(...muted);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(String(index+1).padStart(2,'0'),margin+5,y+7);
  doc.setTextColor(...ink);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(descriptionLines,margin+13,y+7);
  doc.setTextColor(...blue);doc.setFontSize(10);doc.text(clock(duration),width-margin-5,y+7,{align:'right'});
  let lineY=y+10+descriptionLines.length*5;
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...muted);
  doc.text(`${timeLabel(record.inicio)} - ${record.fim?timeLabel(record.fim):'em andamento'}`,margin+5,lineY);lineY+=4;
  if(detailLines.length){doc.text(detailLines,margin+5,lineY);lineY+=detailLines.length*4;}
  if(participants.length)doc.text(participants,margin+5,lineY);
  y+=cardHeight+4;
 });

 const pages=doc.getNumberOfPages();
 for(let page=1;page<=pages;page++){
  doc.setPage(page);doc.setDrawColor(226,231,239);doc.line(margin,height-12,width-margin,height-12);
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...muted);
  doc.text(`Gerado pelo Talki em ${new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(now)}`,margin,height-7);
  doc.text(`Página ${page} de ${pages}`,width-margin,height-7,{align:'right'});
 }
 doc.setProperties({title:`Jornada de ${dateLabel(day)}`,subject:'Relatório diário de jornada',author:'Talki'});
 return doc;
}

export function saveJornadaPdf(options:JornadaPdfOptions) {
 createJornadaPdf(options).save(`talki-jornada-${options.day}.pdf`);
}
