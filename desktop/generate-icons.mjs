import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
const logo = await readFile(new URL('../public/favicon.svg', import.meta.url));
await sharp(logo, { density: 1200 }).resize(1024, 1024, { fit: 'contain', background: '#10111b' }).png().toFile(new URL('assets/icon.png', import.meta.url).pathname);
const tray = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="black" d="M5 5h22v5h-8v17h-6V10H5z"/></svg>');
await sharp(tray).png().toFile(new URL('assets/tray.png', import.meta.url).pathname);
