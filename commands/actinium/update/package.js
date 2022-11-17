export default (props, updatePath) => {
    const { cwd } = props;

    const { path, fs, _, op, prettier } = arcli;

    const packageFile = path.normalize(`${cwd}/package.json`);
    const updatePackageJson = path.normalize(`${updatePath}/package.json`);
    const actiniumConfigFile = path.normalize(
        `${updatePath}/.core/actinium-config.js`,
    );

    let pkg, actiniumConfig, updatePackage;

    // Read the updated actinium-config.js file
    try {
        updatePackage = fs.readJsonSync(updatePackageJson);
    } catch (err) {
        updatePackage = {};
    }

    // Read the current actinium-config.js file
    try {
        actiniumConfig = fs.readJsonSync(actiniumConfigFile);
    } catch (err) {
        actiniumConfig = {};
    }

    // Get the cwd package.json
    try {
        pkg = fs.readJsonSync(packageFile);
    } catch (err) {
        pkg = {};
    }

    // Get scripts object
    let scripts = op.get(pkg, 'scripts', {});

    // Update scripts : remove
    let removeScripts = op.get(
        actiniumConfig,
        'update.package.scripts.remove',
        [],
    );
    removeScripts.forEach(i => {
        delete scripts[i];
    });

    // Update scripts : add
    let addScripts = op.get(actiniumConfig, 'update.package.scripts.add', {});

    Object.entries(addScripts).forEach(([key, value]) => {
        scripts[key] = value;
    });

    // Update scripts object
    pkg['scripts'] = scripts;

    const pkeys = _.without(
        Object.keys(op.get(actiniumConfig, 'update.package')),
        'scripts',
    );

    // Update package objects
    pkeys.forEach(depType => {
        const existingDeps = op.get(pkg, depType, {});
        const addDeps = op.get(updatePackage, depType, {});
        const removeDeps = op
            .get(actiniumConfig, ['update', 'package', depType, 'remove'], [])
            .concat(Object.keys(addDeps));

        pkg[depType] = Object.entries(existingDeps)
            .filter(([name]) => !removeDeps.find(remove => remove === name))
            .concat(Object.entries(addDeps))
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .reduce((newDeps, [key, value]) => {
                newDeps[key] = value;
                return newDeps;
            }, {});
    });

    // Remove actinium_modules deps so we don't get errors if
    // someone has culled their actiniumDependencies object
    Object.entries(pkg.dependencies).forEach(([key, val]) => {
        if (!String(val).startsWith('file:actinium_modules/')) return;
        delete pkg.dependencies[key];
    });

    // Write the new package.json file.
    const pkgCont = prettier.format(JSON.stringify(pkg), {
        parser: 'json-stringify',
        tabWidth: 2,
    });

    return pkgCont;
};
