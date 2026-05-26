import fs from 'fs';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('route.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('app/api');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const routeName = file.replace('app/api/', '/api/').replace('/route.ts', '');
  
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  
  methods.forEach(method => {
    // Look for: export async function METHOD(...
    // and then return handleRoute(async () => {
    // and then find the matching });
    
    const methodStart = `export async function ${method}`;
    let idx = content.indexOf(methodStart);
    if (idx !== -1) {
      let handleRouteIdx = content.indexOf('return handleRoute(async () => {', idx);
      if (handleRouteIdx !== -1 && handleRouteIdx < content.indexOf('export async function', idx + 10) || content.indexOf('export async function', idx + 10) === -1) {
        // Find the matching });
        let openBraces = 0;
        let found = false;
        for (let i = handleRouteIdx + 'return handleRoute('.length; i < content.length; i++) {
          if (content[i] === '{') openBraces++;
          if (content[i] === '}') {
            openBraces--;
            if (openBraces === 0) {
              // The next characters should be `);`
              if (content.substring(i + 1, i + 3) === ');') {
                const before = content.substring(0, i + 1);
                const after = content.substring(i + 1);
                content = before + `, "${method} ${routeName}"` + after;
                found = true;
                break;
              }
            }
          }
        }
      }
    }
  });
  
  fs.writeFileSync(file, content);
});
console.log("Done");
