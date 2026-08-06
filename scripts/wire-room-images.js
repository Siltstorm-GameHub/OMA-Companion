const fs = require('fs');
const path = 'src/lib/room-items.ts';
let src = fs.readFileSync(path, 'utf8');
const mapping = JSON.parse(process.argv[2]);
for (const [key, url] of Object.entries(mapping)) {
  const keyMarker = `key: "${key}",`;
  const start = src.indexOf(keyMarker);
  if (start === -1) { console.error('NICHT GEFUNDEN:', key); process.exit(1); }
  const closeIdx = src.indexOf('\n  },', start);
  const objSlice = src.slice(start, closeIdx);
  if (objSlice.includes('imageUrl:')) {
    src = src.slice(0, start) + objSlice.replace(/imageUrl: "[^"]*",?/, `imageUrl: "${url}",`) + src.slice(closeIdx);
    console.log('aktualisiert:', key);
    continue;
  }
  src = src.slice(0, closeIdx) + `\n    imageUrl: "${url}",` + src.slice(closeIdx);
  console.log('eingefuegt:', key);
}
fs.writeFileSync(path, src);
