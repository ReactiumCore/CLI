import targetApp from '../../../lib/targetApp.js';

export default spinner => {
    let dir, name;
    const { _, chalk, fs, op, path } = arcli;
    const { cwd } = arcli.props; 

    const message = text => {
        if (spinner) {
            spinner.start();
            spinner.text = text;
        }
    };

    const normalize = (...args) => path.normalize(path.join(...args));

    return {
        init: ({ params, props }) => {
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
                text: `Uninstalling ${chalk.cyan(name)}...`,
                symbol: chalk.cyan('–'),
            });

            console.log('');

            await arcli.runCommand('npm', ['uninstall', name]);

            console.log();
        },
        directory: () => {
            message(`Removing plugin ${chalk.cyan(name)}...`);
            fs.removeSync(dir);
        },
        unregisterPkg: async () => {
            message(`Unregistering plugin...`);
            const pkgjson = normalize(cwd, 'package.json');
            const pkg = fs.readJsonSync(pkgjson);
            op.del(pkg, ['dependencies', name]);
            op.del(pkg, [`${app}Dependencies`, name]);
            fs.writeFileSync(pkgjson, JSON.stringify(pkg, null, 2));

            spinner.stop();
            await arcli.runCommand('npm', ['prune']);
        },
        complete: () => {
            console.log('');
            spinner.succeed(`Uninstalled ${chalk.cyan(name)}`);
        },
    };
};
