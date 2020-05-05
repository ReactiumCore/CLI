const path = require('path');
const fs = require('fs-extra');

const normalize = (...args) => path.normalize(path.join(...args));

module.exports = dir => {
    const actiniumConfig = normalize(dir, '.core', 'actinium-config.js');
    const reactiumConfig = normalize(dir, '.core', 'reactium-config.js');

    if (fs.existsSync(actiniumConfig)) return 'actinium';
    if (fs.existsSync(reactiumConfig)) return 'reactium';
};
