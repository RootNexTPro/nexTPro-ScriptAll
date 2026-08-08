const fs = require('fs');

const path = 'nexus-web/server/routes/admins.ts';
let content = fs.readFileSync(path, 'utf8');

// I need to find the creation of an admin to trigger the notification
