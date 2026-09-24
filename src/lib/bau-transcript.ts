import {cleanTranscript,MAX_TRANSCRIPT_CHARS} from './bau-files';
export async function extractTranscript(file:File):Promise<{text:string;warning:string}>{
 const ext=file.name.split('.').pop()?.toLowerCase();let text='';let truncated=false;
 try{
  if(ext==='docx'){
   const mammoth=await import('mammoth');
   text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
  }else if(ext==='pdf'){
   const pdfjs=await import('pdfjs-dist');
   const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
   const loading=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),disableFontFace:true});
   try{const pdf=await loading.promise;truncated=pdf.numPages>500;for(let page=1;page<=Math.min(pdf.numPages,500)&&text.length<MAX_TRANSCRIPT_CHARS;page++){
    const content=await (await pdf.getPage(page)).getTextContent();text+=content.items.map(item=>'str' in item?item.str+('hasEOL' in item&&item.hasEOL?'\n':' '):'').join('')+'\n\n';
   }}finally{await loading.destroy();}
  }else text=await file.text();
  return {text:cleanTranscript(text),warning:!text.trim()?'O arquivo será guardado, mas não contém texto extraível. Cole a transcrição para permitir a busca.':truncated||text.length>MAX_TRANSCRIPT_CHARS?'A leitura e a busca foram limitadas a 500 páginas ou 500 mil caracteres. O arquivo completo será preservado.':''};
 }catch{return {text:'',warning:'Não foi possível extrair o texto deste arquivo. Ele será guardado; você pode colar a transcrição para leitura e busca.'};}
}
