const fs = require('fs');

let readme = fs.readFileSync('README.md', 'utf8');

const newSection = `

## Desktop Agent Bridge & Security

To enhance security, the Cloud Agent (web version) blocks Server-Side Request Forgery (SSRF) attempts by restricting access to \`localhost\`, \`127.0.0.1\`, and private internal networks. 

To test APIs running on your local machine or private network, you must use the **Desktop Agent Bridge**.

### Running the Desktop Agent locally

You can run the agent bridge locally via Node.js:
\`\`\`bash
npm run bridge
\`\`\`
The agent runs on port \`8765\`.

### Building Desktop Agent Binaries

You can compile the Desktop Agent Bridge into standalone executable binaries for Windows, macOS, and Linux using \`pkg\`:
\`\`\`bash
npm run build:agent
\`\`\`
*(Assuming \`build:agent\` is configured to run \`npx pkg agent/desktop-agent.js -t node18-win-x64,node18-linux-x64,node18-macos-x64 --out-path public/downloads\`)*

The binaries will be available in the \`public/downloads\` directory and can be downloaded directly from the web interface.

`;

if (!readme.includes('Desktop Agent Bridge')) {
    readme = readme.replace('## Desktop Build (Electron)', newSection + '## Desktop Build (Electron)');
    fs.writeFileSync('README.md', readme, 'utf8');
    console.log('README updated.');
} else {
    console.log('README already updated.');
}
