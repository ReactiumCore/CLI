import op from 'object-path';

export default dir => {
    const { fs, normalizePath } = arcli;

    const pkgPath = normalizePath(dir, 'package.json');
    const pkg = fs.readJsonSync(pkgPath);

    if (op.get(pkg, 'reactiumDependencies')) {
        return 'reactium';
    }

    if (op.get(pkg, 'actiniumDependencies')) {
        return 'actinium';
    }
};
