export default async ({ props, params }, updatePath) => {
    const { cwd } = props;
    const { type } = params;

    const { _, fs, op, path, prettier } = arcli;

    const packageFile = path.normalize(`${cwd}/package.json`);
    const updatePackageJson = path.normalize(`${updatePath}/package.json`);

    const configFile = path.normalize(
        `${updatePath}/.core/${type.toLowerCase()}-config.js`,
    );

    let pkg, config, updatePackage;

    // Get the .core/<type>-config.js file;
    try {
        updatePackage = fs.readJsonSync(updatePackageJson);
    } catch (err) {
        updatePackage = {};
    }

    try {
        const { default: configObj } = await import(configFile);
        config = configObj;
    } catch (err) {
        config = {};
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
    let removeScripts = op.get(config, 'update.package.scripts.remove', []);
    removeScripts.forEach(i => {
        delete scripts[i];
    });

    // Update scripts : add
    let addScripts = op.get(config, 'update.package.scripts.add', {});

    Object.entries(addScripts).forEach(([key, value]) => {
        scripts[key] = value;
    });

    // Update scripts object
    pkg['scripts'] = scripts;

    const pkeys = _.without(
        Object.keys(op.get(config, 'update.package')),
        'scripts',
    );

    // Update package object
    pkeys.forEach(depType => {
        const existingDeps = op.get(pkg, depType, {});
        const addDeps = op.get(updatePackage, depType, {});
        const removeDeps = op
            .get(config, ['update', 'package', depType, 'remove'], [])
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

    // Remove babel config
    delete pkg.babel;

    // Remove <type>_modules deps so we don't get errors if
    // someone has culled their <type>Dependencies object
    Object.entries(pkg.dependencies).forEach(([key, val]) => {
        if (!String(val).startsWith(`file:${type.toLowerCase()}_modules/`))
            return;
        delete pkg.dependencies[key];
    });

    // Create Workspace block
    if (!op.get(pkg, 'workspaces')) {
        op.set(pkg, 'workspaces', [`${type.toLowerCase()}_modules/**/_npm`]);
    }

    // Write the new package.json file.
    const pkgCont = prettier.format(JSON.stringify(pkg), {
        parser: 'json-stringify',
        tabWidth: 2,
    });

    return pkgCont;
};
