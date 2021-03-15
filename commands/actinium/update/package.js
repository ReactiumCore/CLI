const path = require('path');
const _ = require('underscore');
const op = require('object-path');
const prettier = require('prettier');


module.exports = (props, updatePath) => {
    const { cwd } = props;
    const packageFile = path.normalize(`${cwd}/package.json`);
    const updatePackageJson = path.normalize(`${updatePath}/package.json`);
    const actiniumConfigFile = path.normalize(`${updatePath}/.core/actinium-config.js`);

    let pkg, actiniumConfig, updatePackage;

    // Get the .core/actinium-config.js file;
    try {
        updatePackage = require(updatePackageJson);
        actiniumConfig = require(actiniumConfigFile);
    } catch (err) {
        updatePackage = {};
        actiniumConfig = {};
    }

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

    const pkeys = _.without(Object.keys(op.get(actiniumConfig, 'update.package')), 'scripts');

    // Update dependencies objects
    pkeys.forEach(depType => {
        const existingDeps = op.get(pkg, depType, {});
        const addDeps = op.get(
            updatePackage,
            depType,
            {},
        );
        const removeDeps = op.get(
            actiniumConfig,
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

    // Write the new package.json file.
    let pkgCont = prettier.format(JSON.stringify(pkg), {
        parser: 'json-stringify',
    });

    return pkgCont;
};
