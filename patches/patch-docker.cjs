const fs = require('fs');
let docker = fs.readFileSync('Dockerfile', 'utf8');

if (!docker.includes('npm run build:agent')) {
    docker = docker.replace(
        "RUN npm run build",
        "RUN npm run build:agent\n# Build the application (Vite + Server bundle)\nRUN npm run build"
    );
    fs.writeFileSync('Dockerfile', docker, 'utf8');
    console.log("Dockerfile updated with build:agent.");
} else {
    console.log("Dockerfile already builds agent.");
}
