const npm = require('npm');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');
const mod = path.dirname(require.main.filename);
const targetApp = require(`${mod}/lib/targetApp`);

module.exports = spinner => {
    let dir, cwd, name, pkgdir;

    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    const normalize = (...args) => path.normalize(path.join(...args));

    return {
        init: ({ action, params, props }) => {
            cwd = props.cwd;
            name = op.get(params, 'name');
        },
        check: () => {
            app = targetApp(cwd);
            if (!app) {
                spinner.fail(
                    `Current working directory ${chalk.cyan(
                        cwd,
                    )} is not an Actinium or Reactium project`,
                );
                process.exit();
            }

            // Set module dir
            dir = normalize(cwd, app + '_modules', name);
        },
        npm: async () => {
            spinner.stopAndPersist({
                text: `Uninstalling NPM ${chalk.cyan('package')}...`,
                symbol: chalk.cyan('–'),
            });

            console.log('');

            await new Promise((resolve, reject) =>
                npm.load(err => {
                    if (err) reject(err);

                    npm.commands.uninstall([name], err => {
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
        directory: () => {
            spinner.start();
            message(`Removing plugin ${chalk.cyan(name)}...`)
            fs.removeSync(dir);
        },
        complete: () => {
            console.log('');
            spinner.start();
            spinner.succeed(`Unnstalled ${chalk.cyan(name)}`);
        },
    };
};
