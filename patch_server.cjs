const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`      if (!matchingRequest) {
        return res.status(404).json({
          error: \`No mock route found for [\${req.method}] "\${subpath}"\`,
          availableRoutes: requests.map((r: any) => \`[\${r.method}] \${getPathFromUrl(r.url)}\`)
        });
      }`,
`      if (!matchingRequest) {
        return res.status(404).json({
          error: \`No mock route found for [\${req.method}] "\${subpath}"\`,
          availableRoutes: requests.map((r: any) => \`[\${r.method}] \${getPathFromUrl(r.url)}\`)
        });
      }

      if (matchingRequest.mockResponse && matchingRequest.mockResponse.enabled === false) {
        return res.status(403).json({
          error: \`Mock route for [\${req.method}] "\${subpath}" is currently disabled.\`
        });
      }`
);

code = code.replace(
`      if (!matchingRequest) {
        return res.status(404).json({
          error: \`No mock route found for [\${req.method}] "\${subpath}"\`,
          deployment: {
            id: deployId,
            collectionName: deployment.collectionName,
            version: deployment.version
          },
          availableRoutes: requests.map((r: any) => \`[\${r.method}] \${getPathFromUrl(r.url)}\`)
        });
      }`,
`      if (!matchingRequest) {
        return res.status(404).json({
          error: \`No mock route found for [\${req.method}] "\${subpath}"\`,
          deployment: {
            id: deployId,
            collectionName: deployment.collectionName,
            version: deployment.version
          },
          availableRoutes: requests.map((r: any) => \`[\${r.method}] \${getPathFromUrl(r.url)}\`)
        });
      }

      if (matchingRequest.mockResponse && matchingRequest.mockResponse.enabled === false) {
        return res.status(403).json({
          error: \`Mock route for [\${req.method}] "\${subpath}" is currently disabled.\`
        });
      }`
);

fs.writeFileSync('server.ts', code);
