import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileDetails,MAX_AUDIO_BYTES,MAX_DOCUMENT_BYTES,storagePath,cleanTranscript} from '../src/lib/bau-files.ts';
test('audio and transcript types are classified with deterministic MIME types',()=>{
 assert.equal(fileDetails({name:'Reunião.M4A',size:100}).mime,'audio/mp4');
 assert.equal(fileDetails({name:'transcricao.docx',size:100}).tipo,'transcricao');
 assert.equal(fileDetails({name:'legendas.vtt',size:100}).mime,'text/vtt');
 assert.throws(()=>fileDetails({name:'arquivo.html',size:100}));
 assert.throws(()=>fileDetails({name:'audio.mp3',size:0}));
 assert.throws(()=>fileDetails({name:'audio.mp3',size:MAX_AUDIO_BYTES+1}));
 assert.throws(()=>fileDetails({name:'texto.pdf',size:MAX_DOCUMENT_BYTES+1}));
});
test('storage paths isolate owners, meetings and files without user filenames',()=>{
 assert.equal(storagePath('owner','meeting','file'),'owner/meeting/file');
 assert.notEqual(storagePath('owner','meeting','file'),storagePath('other','meeting','file'));
 assert.equal(cleanTranscript('um\0dois'),'umdois');
 assert.equal(cleanTranscript('a'.repeat(500001)).length,500000);
});
