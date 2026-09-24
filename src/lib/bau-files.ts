export const BAU_BUCKET='talki-bau';
export const MAX_AUDIO_BYTES=50*1024*1024;
export const MAX_DOCUMENT_BYTES=20*1024*1024;
export const MAX_TRANSCRIPT_CHARS=500000;
const audioTypes:Record<string,string>={mp3:'audio/mpeg',m4a:'audio/mp4',mp4:'video/mp4',wav:'audio/wav',ogg:'audio/ogg',opus:'audio/ogg',webm:'audio/webm',flac:'audio/flac',aac:'audio/aac'};
const textTypes:Record<string,string>={txt:'text/plain',md:'text/markdown',srt:'application/x-subrip',vtt:'text/vtt',pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
export const BAU_ACCEPT=Object.keys({...audioTypes,...textTypes}).map(ext=>'.'+ext).join(',');
export function fileDetails(file:{name:string;size:number}){
 const ext=file.name.split('.').pop()?.toLowerCase()??'';
 const tipo=audioTypes[ext]?'audio':textTypes[ext]?'transcricao':null;
 if(!tipo)throw new Error('Formato não suportado. Envie áudio, TXT, MD, SRT, VTT, DOCX ou PDF.');
 if(!file.size)throw new Error('O arquivo está vazio.');
 if(file.name.length>500)throw new Error('O nome do arquivo é muito longo.');
 if(file.size>(tipo==='audio'?MAX_AUDIO_BYTES:MAX_DOCUMENT_BYTES))throw new Error(tipo==='audio'?`O áudio pode ter até ${formatBytes(MAX_AUDIO_BYTES)}.`:'A transcrição pode ter até 20 MB.');
 return {tipo:tipo as 'audio'|'transcricao',mime:audioTypes[ext]??textTypes[ext],ext};
}
export function formatBytes(bytes:number){return bytes>=1024**3?`${(bytes/1024**3).toFixed(1)} GB`:bytes>=1024**2?`${(bytes/1024**2).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;}
export function storagePath(owner:string,entry:string,file:string){return `${owner}/${entry}/${file}`;}
export function cleanTranscript(text:string){return text.replaceAll('\u0000','').slice(0,MAX_TRANSCRIPT_CHARS);}
