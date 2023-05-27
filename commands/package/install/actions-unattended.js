import Actions from './actions.js';
import targetApp from '../../../lib/targetApp.js';

export default (spinner, app) => {
    let deps, plugins;

    const { cwd } = arcli.props;

    const { _, ActionSequence, chalk, fs, normalizePath, op, path } = arcli;

    const message = text => {
        if (spinner) {
            spinner.start();
            spinner.text = text;
        }
    };

    return {
        init: () => {
            if (spinner) spinner.stop();
            app = app || targetApp(cwd);
        },
        plugins: async () => {
            const pkgPath = normalizePath(cwd, 'package.json');
            const pkg = fs.readJsonSync(pkgPath);
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

                const actions = Actions(spinner, app);

                op.del(actions, 'complete');
                op.del(actions, 'registerPkg');

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
        npm: async ({ params }) => {
            if (op.get(params, 'no-npm') === true || op.get(params, 'heroku')) {
                return;
            }

            spinner.stopAndPersist({
                text: `Installing ${chalk.cyan('npm')} dependencies...`,
                symbol: chalk.cyan('+'),
            });

            console.log('');

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
            const pluginsDir = path.resolve(
                normalizePath(cwd, app + '_modules'),
            );

            for (const p in plugins) {
                const name = plugins[p];
                message(`Post Install ${chalk.cyan(name)}...`);

                const dir = normalizePath(pluginsDir, name);
                const glob = `${dir}/**/arcli-install-unattended.js`;
                const actionFiles = arcli.globby(glob);

                if (actionFiles.length < 1) continue;

                const actions = {};

                for (let i = 0; i < actionFiles.length; i++) {
                    const file = actionFiles[i];
                    const mod = await import(normalizePath(file));
                    const acts = mod(spinner, arcli, params, props);
                    Object.keys(acts).forEach(key =>
                        op.set(actions, `postinstall_${i}_${key}`, acts[key]),
                    );
                }

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
