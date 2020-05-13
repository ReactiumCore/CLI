const npm = require('npm');
const tar = require('tar');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const globby = require('globby');
const op = require('object-path');
const request = require('request');
const mod = path.dirname(require.main.filename);
const targetApp = require(`${mod}/lib/targetApp`);
const ActionSequence = require('action-sequence');

module.exports = spinner => {
    let app, cwd, dir, filepath, name, plugin, sessionToken, tmp, url, version;

    const message = text => {
        if (spinner) {
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
                process.exit();
            }

            name = _.compact(String(name).split('@'))[0];
            name = String(params.name).substr(0, 1) === '@' ? `@${name}` : name;

            const appID = op.get(props, 'config.registry.app', 'ReactiumRegistry');
            const serverURL = op.get(props, 'config.registry.server', 'https://v1.reactium.io/api');

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
                process.exit();
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
                })
                .catch(err => {
                    spinner.fail(err.message);
                    console.log('');
                    process.exit();
                });
        },
        version: ({ params }) => {
            const versions = Object.values(op.get(plugin, 'version', {}));
            const nrr = _.compact(String(params.name).split('@'));
            version = nrr.length > 1 ? nrr[1] : 'latest';

            plugin =
                version !== 'latest'
                    ? _.findWhere(versions, { version })
                    : _.last(versions);
        },
        download: () => {
            message(`Downloading ${chalk.cyan(`${name}@${version}`)}...`);

            // Set module dir
            dir = normalize(cwd, app + '_modules', slugify(name));

            // Create tmp directory
            tmp = normalize(dir + '_tmp');
            fs.ensureDirSync(tmp);

            // File path
            filepath = normalize(tmp, plugin.file.name());

            // Pipe download to tmp path
            return new Promise((resolve, reject) => {
                request(plugin.file.url())
                    .pipe(fs.createWriteStream(filepath))
                    .on('error', error => reject(error))
                    .on('close', () => resolve({ action, status: 200 }));
            });
        },
        extract: () => {
            message(`Extracting ${chalk.cyan(`${name}@${version}`)}...`);

            tar.extract({
                cwd: tmp,
                file: filepath,
                sync: true,
            });
        },
        move: () => {
            message(`Copying ${chalk.cyan('files')}...`);
            fs.ensureDirSync(dir);
            fs.removeSync(filepath);
            fs.removeSync(dir);
            fs.ensureDirSync(dir);
            fs.copySync(tmp, dir);
            fs.removeSync(tmp);
            fs.ensureDirSync(normalize(dir, 'npm'));
            fs.moveSync(
                normalize(dir, 'package.json'),
                normalize(dir, '_npm', 'package.json'),
                { overwrite: true },
            );
        },
        registerPkg: () => {
            message(`Registering plugin...`);
            const pkgjson = normalize(cwd, 'package.json');
            const pkg = require(pkgjson);
            op.set(pkg, [`${app}Dependencies`, name], version);
            fs.writeFileSync(pkgjson, JSON.stringify(pkg, null, 2));
        },
        postinstall: async ({ params, props }) => {
            const actionFiles= await globby([`${dir}/**/arcli-install.js`]);
            if (actionFiles.length < 1) return;

            const actions = actionFiles.reduce((obj, file, i) => {
                const acts = require(normalize(file))(spinner);
                Object.keys(acts).forEach(key => {
                    obj[`postinstall_${i}_${key}`] = acts[key];
                });
                return obj;
            }, {});

            params['pluginDirectory'] = dir; 
            await ActionSequence({ actions, options: { params, props } });
        },
        npm: async () => {
            spinner.stopAndPersist({
                text: `Installing ${chalk.cyan('dependencies')}...`,
                symbol: chalk.cyan('+'),
            });

            console.log('');

            const pkg = [`./${app}_modules`, slugify(name), '_npm'].join('/');

            await new Promise((resolve, reject) =>
                npm.load(err => {
                    if (err) reject(err);

                    npm.commands.install([pkg], err => {
                        if (err) reject(err);
                        else resolve();
                    });
                }),
            )
                .then(() => console.log(''))
                .catch(err => {
                    console.log(err);
                    process.exit();
                });
        },
        complete: () => {
            console.log('');
            spinner.start();
            spinner.succeed(`Installed ${chalk.cyan(`${name}@${version}`)}`);
        },
    };
};
