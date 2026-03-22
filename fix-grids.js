const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/src/pages');

function crawl(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    const items = fs.readdirSync(currentPath);
    for (const item of items) {
        const full = path.join(currentPath, item);
        if (fs.statSync(full).isDirectory()) {
            crawl(full);
        } else if (full.endsWith('.jsx')) {
            let content = fs.readFileSync(full, 'utf8');
            let modified = false;

            // Mapping raw string grids to classes
            const map = [
                { regex: /<div style={{\s*display:\s*['"]grid['"],\s*gridTemplateColumns:\s*['"]repeat\(4,\s*1fr\)['"],?\s*(.*?)}}\s*>/g, replace: '<div className="grid-4" style={{ $1 }}>' },
                { regex: /<div style={{\s*display:\s*['"]grid['"],\s*gridTemplateColumns:\s*['"]repeat\(3,\s*1fr\)['"],?\s*(.*?)}}\s*>/g, replace: '<div className="grid-3" style={{ $1 }}>' },
                { regex: /<div style={{\s*display:\s*['"]grid['"],\s*gridTemplateColumns:\s*['"]1fr 1fr 1fr['"],?\s*(.*?)}}\s*>/g, replace: '<div className="grid-3" style={{ $1 }}>' },
                { regex: /<div style={{\s*display:\s*['"]grid['"],\s*gridTemplateColumns:\s*['"]1fr 1fr['"],?\s*(.*?)}}\s*>/g, replace: '<div className="grid-2" style={{ $1 }}>' }
            ];

            map.forEach(op => {
                if (op.regex.test(content)) {
                    content = content.replace(op.regex, op.replace);
                    // clean up empty styles
                    content = content.replace(/style={{ \s*}}/g, '');
                    modified = true;
                }
            });

            if (modified) {
                fs.writeFileSync(full, content, 'utf8');
                console.log(`Updated grids in: ${item}`);
            }
        }
    }
}

crawl(dir);
console.log('Done scanning for inline grids');
