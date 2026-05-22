const fs = require('fs');
const path = require('path');

const apiBaseUrl = (process.env.API_BASE_URL || process.env.API_URL || '').replace(/\/$/, '');
const envFile = path.join(__dirname, '..', 'frontend', 'js', 'env.js');
const content = 'window.__ENV__ = Object.assign({}, window.__ENV__ || {}, ' +
    JSON.stringify({ API_BASE_URL: apiBaseUrl }, null, 4) +
    ');\n';

fs.writeFileSync(envFile, content);

if (apiBaseUrl) {
    console.log('Netlify env written with API_BASE_URL=' + apiBaseUrl);
} else {
    console.warn('API_BASE_URL is not set. The deployed frontend will use the production fallback from frontend/js/config.js.');
}
