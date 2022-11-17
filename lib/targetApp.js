export default dir => {
    const { fs, normalizePath } = arcli;

    const actiniumConfig = normalizePath(dir, '.core', 'actinium-config.js');
    const reactiumConfig = normalizePath(dir, '.core', 'reactium-config.js');

    if (fs.existsSync(actiniumConfig)) return 'actinium';
    if (fs.existsSync(reactiumConfig)) return 'reactium';
};
