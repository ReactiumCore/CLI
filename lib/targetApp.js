import fs from 'fs-extra';
import path from 'node:path';

const normalize = (...args) => path.normalize(path.join(...args));

export default dir => {
    const actiniumConfig = normalize(dir, '.core', 'actinium-config.js');
    const reactiumConfig = normalize(dir, '.core', 'reactium-config.js');

    if (fs.existsSync(actiniumConfig)) return 'actinium';
    if (fs.existsSync(reactiumConfig)) return 'reactium';
};
