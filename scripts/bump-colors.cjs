const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      content = content.replace(/text-neutral-700/g, 'text-zinc-600');
      content = content.replace(/text-neutral-600/g, 'text-zinc-500');
      content = content.replace(/text-neutral-500/g, 'text-zinc-400');
      content = content.replace(/text-neutral-400/g, 'text-zinc-300');
      content = content.replace(/text-neutral-300/g, 'text-zinc-200');
      content = content.replace(/text-neutral-200/g, 'text-zinc-100');
      content = content.replace(/bg-neutral-/g, 'bg-zinc-');
      content = content.replace(/text-neutral-/g, 'text-zinc-');
      
      fs.writeFileSync(fullPath, content);
    }
  });
}

processDir('./src');
console.log('Colors replaced successfully');
