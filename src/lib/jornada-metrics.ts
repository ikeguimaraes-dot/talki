export function spDay(instant: string | Date = new Date()): string {
 return new Intl.DateTimeFormat('en-CA',{ timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date(instant));
}
export function dayStart(day: string): string { return new Date(`${day}T00:00:00-03:00`).toISOString(); }
export function addDays(day: string, delta: number): string {
 const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+delta);return date.toISOString().slice(0,10);
}
export function weekdays(first: string,last: string): number {
 let count=0;
 for(let day=first;day<=last;day=addDays(day,1)) {const n=new Date(day+'T12:00:00Z').getUTCDay();if(n>0&&n<6)count++;}
 return count;
}
export function secondsInRange(r: {inicio:string;fim:string|null}, start:string,end:string,now?:string): number {
 const stop=r.fim ?? now;
 if(!stop)return 0;
 return Math.max(0,(Math.min(Date.parse(stop),Date.parse(end))-Math.max(Date.parse(r.inicio),Date.parse(start)))/1000);
}
export function clock(seconds: number): string {
 const total=Math.max(0,Math.floor(seconds));return [Math.floor(total/3600),Math.floor(total/60)%60,total%60].map(n=>String(n).padStart(2,'0')).join(':');
}
export function hours(seconds:number): string { return (seconds/3600).toLocaleString('pt-BR',{maximumFractionDigits:2})+' h'; }
export function scoreDelta(percent:number): number {return percent>=100?5:percent>=90?3:percent>=80?2:percent>=70?1:percent>=60?-1:percent>=50?-2:-5;}
export function dragon(coins:number): string {return coins===0?'Ovo':coins<10?'Bebê':coins<25?'Filhote':coins<50?'Jovem':'Adulto';}
export function level(coins:number): string {return coins<100?'Bronze':coins<300?'Prata':coins<700?'Ouro':coins<1500?'Platina':'Diamante';}
