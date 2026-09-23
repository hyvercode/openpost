const fs = require('fs');
let content = fs.readFileSync('src/components/RequestPanel.tsx', 'utf8');

const regex = /    \/\/ Injected Authentication configurations/;

const cookieLogic = `
    // Inject Cookies
    if (finalUrl) {
      try {
        const urlObj = new URL(finalUrl.startsWith('http') ? finalUrl : 'http://' + finalUrl);
        const { cookies } = useStore.getState();
        const activeCookies = cookies.filter(c => 
          c.workspaceId === currentWorkspace?.id && 
          urlObj.hostname.includes(c.domain) &&
          urlObj.pathname.startsWith(c.path || '/')
        );
        
        if (activeCookies.length > 0) {
          const cookieString = activeCookies.map(c => \`\${c.name}=\${c.value}\`).join('; ');
          if (finalHeaders['Cookie']) {
            finalHeaders['Cookie'] = finalHeaders['Cookie'] + '; ' + cookieString;
          } else {
            finalHeaders['Cookie'] = cookieString;
          }
        }
      } catch (e) {}
    }

    // Injected Authentication configurations`;

content = content.replace(regex, cookieLogic);

fs.writeFileSync('src/components/RequestPanel.tsx', content);
console.log('patched cookies into request');
