#!/usr/bin/env bash
set -euo pipefail

node <<'JS'
const fs=require('fs');
let s=fs.readFileSync('server.cjs','utf8');
if (!s.includes("require('./server/api.cjs')")) {
  const needle = "const app = express();";
  if (s.includes(needle)) {
    const parts = s.split(needle);
    s = parts[0] + needle + "\nconst mountApi = require('./server/api.cjs');\nmountApi(app);\n" + parts.slice(1).join(needle);
    fs.writeFileSync('server.cjs', s);
    console.log('server.cjs patched');
  } else {
    console.log('Did not find \"const app = express();\" in server.cjs');
  }
} else {
  console.log('server.cjs already wired');
}
JS

node <<'JS'
const fs=require('fs');
const p='.env';
let s='';
try{s=fs.readFileSync(p,'utf8')}catch{}
if (!s.includes('JWT_SECRET=')) {
  s += (s.endsWith('\n')?'':'\n') + 'JWT_SECRET=devsecret\nTOKEN_EXPIRES_IN=7d\n';
  fs.writeFileSync(p,s);
  console.log('.env updated');
} else {
  console.log('.env already has JWT settings');
}
JS

[ -f server/storage/users.json ] || printf '[]\n' > server/storage/users.json
[ -f server/storage/quotes.json ] || printf '[]\n' > server/storage/quotes.json

echo 'Done. Start your API with: node server.cjs'
