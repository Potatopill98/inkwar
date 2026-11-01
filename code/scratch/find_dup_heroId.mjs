import fs from 'fs';
import path from 'path';

function findJs(dir) {
  let list = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== 'scratch') {
      list = list.concat(findJs(p));
    } else if (f.isFile() && f.name.endsWith('.js')) {
      list.push(p);
    }
  }
  return list;
}

const files = findJs('src');
for (const f of files) {
  try {
    const rel = '../' + f.replace(/\\/g, '/');
    await import(rel);
    console.log('OK:', f);
  } catch (err) {
    console.error('ERROR in', f, ':', err.message);
  }
}
