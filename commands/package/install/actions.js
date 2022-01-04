const npm = require('npm');
const tar = require('tar');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');
const request = require('request');
const globby = require('globby').sync;
const mod = path.dirname(require.main.filename);
const deleteEmpty = require('delete-empty').sync;
const targetApp = require(`${mod}/lib/targetApp`);
const ActionSequence = require('action-sequence');

const { arcli } = global;

module.exports = spinner => {
    let app, cwd, dir, filepath, name, plugin, sessionToken, tmp, url, version;

    const message = text => {
        if (spinner) {
            spinner.start();
            spinner.text = text;
        }
    };

    const slugify = str =>
        String(str)
            .toLowerCase()
            .replace(/[^0-9a-z@\-\/]/gi, '-');

    const normalize = (...args) => path.normalize(path.join(...args));

    return {
        init: ({ params, props }) => {
            cwd = String(props.cwd)
                .split('\\')
                .join('/');

            app = targetApp(cwd);

            sessionToken = op.get(props, 'config.registry.sessionToken');

            name = op.get(params, 'name');

            if (!name) {
                spinner.fail('input plugin name');
                process.exit(1);
            }

            name = _.compact(String(name).split('@'))[0];
            name = String(params.name).substr(0, 1) === '@' ? `@${name}` : name;

            dir = normalize(cwd, app + '_modules', slugify(name));

            // Ensure module dir
            fs.ensureDirSync(normalize(cwd, app + '_modules'));

            const appID = op.get(
                props,
                'config.registry.app',
                'ReactiumRegistry',
            );
            const serverURL = op.get(
                props,
                'config.registry.server',
                'https://v1.reactium.io/api',
            );

            Actinium.serverURL = serverURL;
            Actinium.initialize(appID);
        },
        check: () => {
            if (!app) {
                spinner.fail(
                    `Current working directory ${chalk.cyan(
                        cwd,
                    )} is not an Actinium or Reactium project`,
                );
                process.exit(1);
            }
        },
        fetch: () => {
            message(`Fetching ${chalk.cyan('plugin')}...`);

            return Actinium.Cloud.run(
                'registry-get',
                { name, serialized: true },
                { sessionToken },
            )
                .then(result => {
                    plugin = result;
                    if (!plugin) throw new Error('Unable to get plugin.');
                })
                .catch(err => {
                    spinner.fail(err.message);
                    console.error(err.message);
                    process.exit(1);
                });
        },
        version: ({ params }) => {
            const versions = Object.values(op.get(plugin, 'version', {}));
            const nrr = _.compact(String(params.name).split('@'));
            version = nrr.length > 1 ? _.last(nrr) : 'latest';

            plugin =
                version !== 'latest'
                    ? _.findWhere(versions, { version })
                    : _.last(versions);

            if (!plugin || !op.get(plugin, 'file')) {
                console.error('Unable to find plugin version.');
                process.exit(1);
            }

            version = plugin.version;
        },
        download: () => {
            message(`Downloading ${chalk.cyan(`${name}@${version}`)}...`);

            // Create tmp directory
            tmp = normalize(dir + '_tmp');
            fs.ensureDirSync(tmp);

            // File path
            filepath = normalize(tmp, plugin.file.name());

            // Pipe download to tmp path
            return new Promise((resolve, reject) =>
                request(plugin.file.url())
                    .pipe(fs.createWriteStream(filepath))
                    .on('error', error => reject(error))
                    .on('close', () => resolve({ action, status: 200 })),
            );
        },
        extract: async () => {
            message(`Extracting ${chalk.cyan(`${name}@${version}`)}...`);

            tar.extract({
                cwd: tmp,
                file: filepath,
                sync: true,
            });
        },
        move: () => {
            try {
                message(`Copying ${chalk.cyan('files')}...`);

                fs.removeSync(filepath);

                fs.ensureDirSync(dir);
                fs.emptyDirSync(dir);
                fs.moveSync(tmp, dir, { overwrite: true });

                fs.ensureDirSync(normalize(dir, '_npm'));
                fs.copySync(
                    normalize(dir, 'package.json'),
                    normalize(dir, '_npm', 'package.json'),
                    { overwrite: true },
                );
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        },
        static: () => {
            spinner.stop();
            fs.ensureDirSync(normalize(dir, '_static'));

            const assets = globby([path.join(dir, '/**/assets/**')]);
            assets.forEach(file => {
                let newFile = file.split('/assets/').pop();
                newFile = normalize(dir, '_static', 'assets', newFile);
                fs.ensureDirSync(path.dirname(newFile));
                fs.moveSync(file, newFile);
            });
            deleteEmpty(dir);
        },
        registerPkg: () => {
            message(`Registering plugin...`);
            const pkgjson = normalize(cwd, 'package.json');
            const pkg = require(pkgjson);
            op.set(pkg, [`${app}Dependencies`, name], version);
            fs.writeFileSync(pkgjson, JSON.stringify(pkg, null, 2));
        },
        npm: async ({ params }) => {
            if (
                op.get(params, 'no-npm') === true ||
                op.get(params, 'unattended') === true
            ) {
                return;
            }

            spinner.stopAndPersist({
                text: `Installing ${chalk.cyan(name)} dependencies...`,
                symbol: chalk.cyan('+'),
            });

            console.log('');

            const pkg = normalize(`${app}_modules`, slugify(name), '_npm');
            try {
                await arcli.runCommand('npm', ['uninstall', pkg]);
                await arcli.runCommand('npm', ['install', pkg]);
            } catch (error) {
                console.error({ error });
                process.exit(1);
            }
        },
        postinstall: async ({ params, props }) => {
            if (
                op.get(params, 'no-npm') === true ||
                op.get(params, 'unattended') === true
            )
                return;

            const actionFiles = globby([`${dir}/**/arcli-install.js`]);
            if (actionFiles.length < 1) return;

            const actions = actionFiles.reduce((obj, file, i) => {
                const acts = require(normalize(file))(
                    spinner,
                    arcli,
                    params,
                    props,
                );
                Object.keys(acts).forEach(key => {
                    obj[`postinstall_${i}_${key}`] = acts[key];
                });
                return obj;
            }, {});

            params['pluginDirectory'] = dir;
            await ActionSequence({ actions, options: { params, props } });
        },
        complete: () => {
            console.log('');
            if (spinner) {
                spinner.start();
                spinner.succeed(
                    `Installed ${chalk.cyan(`${name}@${version}`)}`,
                );
            }
        },
    };
};
