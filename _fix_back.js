const fs = require('fs');
const c = fs.readFileSync('www/js/screens/pdf-report.js', 'utf8');
// Replace `${t(\'back\') || t(\'btn_back\') || \'←\'}` with `${t(\'back\') || \'←\'}`
const updated = c.replace(
  "${t(\\'back\\') || t(\\'btn_back\\') || \\'←\\'}",
  "${t(\\'back\\') || \\'←\\'}"
);
fs.writeFileSync('www/js/screens/pdf-report.js', updated);
console.log('Done');
