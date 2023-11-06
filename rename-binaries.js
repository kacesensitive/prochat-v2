const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let extension = process.platform === 'win32' ? '.exe' : '';

function main() {
    const rustInfo = execSync('rustc -vV').toString();
    const targetTriple = /host: (\S+)/g.exec(rustInfo)[1];
    if (!targetTriple) {
        console.error('Failed to determine platform target triple');
        process.exit(1);
    }

    const binariesDir = path.join('src-tauri', 'bin');
    fs.readdirSync(binariesDir).forEach(file => {
        if (file.includes(targetTriple)) {
            console.log(`Skipping rename for ${file} as it already contains the target triple.`);
            return;
        }

        const currentPath = path.join(binariesDir, file);
        const newPath = path.join(binariesDir, `${path.basename(file, extension)}-${targetTriple}${extension}`);
        fs.renameSync(currentPath, newPath);
        console.log(`Renamed ${file} to ${path.basename(newPath)}`);
    });
}

main();
