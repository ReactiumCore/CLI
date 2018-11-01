const path     = require('path');
const prettier = require('prettier');
const op       = require('object-path');

module.exports = props => {
    const { cwd } = props;

    const packageFile        = path.normalize(`${cwd}/package.json`);
    const reactiumConfigFile = path.normalize(`${cwd}/.core/reactium-config`);

    let pkg, reactiumConfig;

    // Get the .core/reactium-config.js file;
    try {
        reactiumConfig = require(reactiumConfigFile);
    } catch (err) {
        reactiumConfig = {};
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
        reactiumConfig,
        'update.package.scripts.remove',
        []
    );
    removeScripts.forEach((i) => {
        delete scripts[i];
    });

    // Update scripts : add
    let addScripts = op.get(
        reactiumConfig,
        'update.package.scripts.add',
        {}
    );

    Object.entries(addScripts).forEach(([key, value]) => {
        scripts[key] = value;
    });

    // Update scripts object
    pkg['scripts'] = scripts;

    // Get devDependencies
    let devDependencies = op.get(pkg, 'devDependencies', {});

    // Update devDependencies : remove
    let removeDevDependencies = op.get(
        reactiumConfig,
        'update.package.devDependencies.remove',
        []
    );

    removeDevDependencies.forEach((i) => {
        delete devDependencies[i];
    });

    // Update devDependencies : add
    let addDevDependencies = op.get(
        reactiumConfig,
        'update.package.devDependencies.add',
        {}
    );

    Object.entries(addDevDependencies).forEach(([key, value]) => {
        devDependencies[key] = value;
    });

    // Update devDependencies object
    pkg['devDependencies'] = devDependencies;

    // Get dependencies
    let dependencies = op.get(pkg, 'dependencies', {});

    // Update dependencies : remove
    let removeDependencies = op.get(
        reactiumConfig,
        'update.package.dependencies.remove',
        []
    );

    removeDependencies.forEach((i) => {
        delete dependencies[i];
    });

    // Update dependencies : add
    let addDependencies = op.get(
        reactiumConfig,
        'update.package.dependencies.add',
        {}
    );

    Object.entries(addDependencies).forEach(([key, value]) => {
        dependencies[key] = value;
    });

    // Update dependencies object
    pkg['dependencies'] = dependencies;

    // Write the new package.json file.
    let pkgCont = prettier.format(
        JSON.stringify(pkg),
        {parser: 'json-stringify'}
    );

    return pkgCont;
};
