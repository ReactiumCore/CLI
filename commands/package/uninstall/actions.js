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

            await arcli.runCommand('npm', ['uninstall', name]);                
        },
        directory: () => {
            spinner.start();
            message(`Removing plugin ${chalk.cyan(name)}...`)
            fs.removeSync(dir);
        },
        unregisterPkg: () => {
            message(`Unregistering plugin...`);
            const pkgjson = normalize(cwd, 'package.json');
            const pkg = require(pkgjson);
            op.del(pkg, [`${app}Dependencies`, name]);
            fs.writeFileSync(pkgjson, JSON.stringify(pkg, null, 2));
        },
        complete: () => {
            console.log('');
            spinner.start();
            spinner.succeed(`Uninstalled ${chalk.cyan(name)}`);
        },
    };
};
