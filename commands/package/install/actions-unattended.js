const npm = require('npm');
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
    let app, cwd, plugins;

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
            cwd = op.get(props, 'cwd');
            app = targetApp(cwd);
        },
        plugins: () => {
            const pkgPath = normalize(cwd, 'package.json');
            const pkg = require(pkgPath);
            const depKey = `${app}Dependencies`;
            const deps = op.get(pkg, depKey, {});

            plugins = Object.entries(deps).map(
                ([name, version]) => `${name}@${version}`,
            );

            plugins.sort();
        },
        install: async ({ params, props }) => {
            for (const i in plugins) {
                const name = plugins[i];
                spinner.start();
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

            const packageJsonPath = normalize(cwd, 'package.json');
            const pkg = require(packageJsonPath);

            for (const i in plugins) {
                const nameArr = plugins[i].split('@');
                nameArr.pop();

                const name = nameArr.join('@');

                const pkgPath = normalize(`${app}_modules`, name);
                op.set(pkg, `dependencies.${name}`, `file:${pkgPath}`);
            }

            // Update the package.json file
            fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2))

            // Run npm install
            await arcli.runCommand('npm', ['install']);
        },
        complete: () => {
            console.log('');
            if (plugins.length > 0) spinner.succeed(`Installed:`);
            else spinner.succeed('complete!');

            plugins.forEach(plugin => console.log('   ', chalk.cyan(plugin)));
        },
    };
};
