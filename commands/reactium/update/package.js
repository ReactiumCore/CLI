const path = require('path');
const prettier = require('prettier');
const op = require('object-path');

module.exports = (props, updatePath) => {
    const updatePackageJson = path.normalize(`${updatePath}/package.json`);
    const reactiumConfigFile = path.normalize(`${updatePath}/.core/reactium-config.js`);
    const { cwd } = props;
    const packageFile = path.normalize(`${cwd}/package.json`);

    let pkg, reactiumConfig, updatePackage;

    // Get the .core/reactium-config.js file;
    try {
        updatePackage = require(updatePackageJson);
        reactiumConfig = require(reactiumConfigFile);
    } catch (err) {
        updatePackage = {};
        reactiumConfig = {};
    }

    // Get the current .core version
    const { version } = reactiumConfig;

    // Get the cwd package.json
    try {
        pkg = require(packageFile);
    } catch (err) {
        pkg = {};
    }

    // Get scripts object
    let scripts = op.get(pkg, 'scripts', {});

    // Update scripts : remove
    let removeScripts = op.get(
        reactiumConfig,
        'update.package.scripts.remove',
        [],
    );
    removeScripts.forEach(i => {
        delete scripts[i];
    });

    // Update scripts : add
    let addScripts = op.get(reactiumConfig, 'update.package.scripts.add', {});

    Object.entries(addScripts).forEach(([key, value]) => {
        scripts[key] = value;
    });

    // Update scripts object
    pkg['scripts'] = scripts;

    // Update dependencies objects
    ['dependencies', 'devDependencies'].forEach(depType => {
        const existingDeps = op.get(pkg, depType, {});
        const addDeps = op.get(
            updatePackage,
            depType,
            {},
        );
        const removeDeps = op.get(
            reactiumConfig,
            ['update', 'package', depType, 'remove'],
            [],
        ).concat(Object.keys(addDeps));

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

    // Write the new package.json file.
    let pkgCont = prettier.format(JSON.stringify(pkg), {
        parser: 'json-stringify',
    });

    return pkgCont;
};
