const tar = require('tar');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');
const request = require('request');
const mod = path.dirname(require.main.filename);
const targetApp = require(`${mod}/lib/targetApp`);
const ActionSequence = require('action-sequence');

const { arcli } = global;

module.exports = spinner => {
    let deps, app, cwd, plugins, pluginsDir;

    const actions = require('./actions')(spinner);

    // op.del(actions, 'npm');
    op.del(actions, 'complete');
    op.del(actions, 'registerPkg');

    const message = text => {
        if (spinner) {
            spinner.start();
            spinner.text = text;
        }
    };

    const normalize = (...args) => path.normalize(path.join(...args));

    return {
        init: ({ params, props }) => {
            spinner.stop();

            cwd = op.get(props, 'cwd');
            app = targetApp(cwd);
            pluginsDir = path.resolve(cwd, app + '_modules');
        },
        plugins: () => {
            const pkgPath = normalize(cwd, 'package.json');
            const pkg = require(pkgPath);
            const depKey = `${app}Dependencies`;
            deps = op.get(pkg, depKey, {});

            plugins = Object.entries(deps).map(
                ([name, version]) => `${name}@${version}`,
            );

            plugins.sort();
        },
        download: async ({ params, props }) => {
            for (const i in plugins) {
                const name = plugins[i];
                message(`Downloading ${chalk.cyan(name)}...`);

                await ActionSequence({
                    actions,
                    options: {
                        params: { ...params, name, unattended: true },
                        props,
                    },
                });
            }

            spinner.stopAndPersist({
                text: `Downloaded ${chalk.cyan('plugins')}`,
                symbol: chalk.green('✓'),
            });
        },
        npm: async ({ params, props }) => {
            if (op.get(params, 'no-npm') === true) return;

            spinner.stopAndPersist({
                text: `Installing npm dependencies...`,
                symbol: chalk.cyan('+'),
            });

            console.log('');

            if (op.get(params, 'save')) {
                const packageJsonPath = normalize(cwd, 'package.json');
                const pkg = require(packageJsonPath);

                for (const i in plugins) {
                    const nameArr = plugins[i].split('@');
                    nameArr.pop();

                    const name = nameArr.join('@');

                    const pkgPath = normalize(`${app}_modules`, name, '_npm');
                    op.set(pkg, `dependencies.${name}`, `file:${pkgPath}`);
                }

                // Update the package.json file
                fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
            }

            spinner.stop();

            // Run npm install
            try {
                await arcli.runCommand('npm', ['prune']);
                await arcli.runCommand('npm', ['install']);
                console.log('');
            } catch (error) {
                console.error(error);
                process.exit(1);
            }
        },
        postinstall: async ({ params, props }) => {
            if (op.get(params, 'no-npm') === true) return;
            const plugins = Object.keys(deps);

            for (const i in plugins) {
                const name = plugins[i];
                message(`Post Install ${chalk.cyan(name)}...`);

                const dir = normalize(pluginsDir, name);
                const actionFiles = arcli.globby([
                    `${dir}/**/arcli-install-unattended.js`,
                ]);
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

                params['name'] = name;
                params['pluginDirectory'] = dir;
                await ActionSequence({ actions, options: { params, props } });
            }
        },

        complete: () => {
            if (plugins.length > 0) spinner.succeed(`Installed:`);
            else spinner.succeed('complete!');

            plugins.forEach(plugin => console.log('   ', chalk.cyan(plugin)));
        },
    };
};
