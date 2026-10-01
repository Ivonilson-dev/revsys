// Universal Entrypoint para RevSys (HostGator cPanel Passenger / Node / TSX)
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const distApp = path.join(__dirname, 'dist', 'src', 'app.js');

if (fs.existsSync(distApp)) {
  module.exports = require(distApp);
} else {
  // Em desenvolvimento
  module.exports = require('./src/app.ts');
}
