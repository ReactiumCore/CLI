import fs from 'fs-extra';
import path from 'node:path';
import op from 'object-path';

export const normalize = (...args) => path.normalize(path.join(...args));

export const detect = async ({ props, params }) => {
    const { cwd } = props;

    const fileDetect = {
        Reactium: [
            `${cwd}/.core/reactium-config.js`, // old
            `${cwd}/reactium_modules/@atomic-reactor/reactium-core/reactium-config.js`, // new
        ],
        Actinium: [
            `${cwd}/.core/actinium-config.js`, // old
            `${cwd}/actinium_modules/@atomic-reactor/actinium-core/actinium-config.js`, // new
        ],
    };

    const [projectType, configFile] =
        Object.entries(fileDetect)
            .map(([type, paths = []]) => {
                const found = paths.find(fs.existsSync);
                if (found) {
                    return [type, found];
                }

                return false;
            })
            .find(Boolean) || [];

    params.type = projectType;
    params.originalConfigFile = configFile;

    // Attempt to determine from package.json
    if (!projectType) {
        try {
            const pkgJson = fs.readJSONSync(path.resolve(cwd, 'package.json'));
            if (
                op
                    .get(pkgJson, 'workspaces', [])
                    .find(ws => /reactium_modules/.test(ws)) ||
                op.has(pkgJson, 'reactiumDependencies')
            )
                return [
                    'Reactium',
                    `${cwd}/reactium_modules/@atomic-reactor/reactium-core/reactium-config.js`,
                ];
            if (
                op
                    .get(pkgJson, 'workspaces', [])
                    .find(ws => /actinium_modules/.test(ws)) ||
                op.has(pkgJson, 'actiniumDependencies')
            )
                return [
                    'Actinium',
                    `${cwd}/actinium_modules/@atomic-reactor/actinium-core/actinium-config.js`,
                ];
        } catch (error) {}
    }

    return [projectType, configFile];
};

export const getUpdatedConfig = ({ props, params }, updatePath) => {
    const { cwd } = props;
    const { type, updateBaseDir } = params;
    const typeSlug = type.toLowerCase();

    return normalize(
        cwd,
        `${typeSlug}_modules/@atomic-reactor/${typeSlug}-core/${typeSlug}-config.js`,
    );
};

export default async ({ props, params }, updatePath) => {
    const { cwd } = props;
    const { type } = params;

    const { _, fs, op, path, prettier } = arcli;

    const packageFile = path.normalize(`${cwd}/package.json`);
    const updatePackageJson = path.normalize(`${updatePath}/package.json`);

    const configFile = params.originalConfigFile;

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
    op.set(pkg, 'workspaces', [
        `${type.toLowerCase()}_modules/*`,
        `${type.toLowerCase()}_modules/*/*`,
    ]);

    // Write the new package.json file.
    const pkgCont = prettier.format(JSON.stringify(pkg), {
        parser: 'json-stringify',
        tabWidth: 2,
    });

    return pkgCont;
};
