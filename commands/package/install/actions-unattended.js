import Actions from './actions.js';
import targetApp from '../../../lib/targetApp.js';

export default spinner => {
    let deps, plugins;

    const { cwd } = arcli.props;

    const { _, ActionSequence, chalk, fs, normalizePath, op, path } = arcli;

    const app = targetApp(cwd);

    const pluginsDir = path.resolve(normalizePath(cwd, app + '_modules'));

    const actions = Actions(spinner);

    op.del(actions, 'complete');
    op.del(actions, 'registerPkg');

    const message = text => {
        if (spinner) {
            spinner.start();
            spinner.text = text;
        }
    };

    return {
        init: () => {
            if (spinner) spinner.stop();
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
                // Kill package-lock.json
                const packageLockPath = normalizePath(cwd, 'package-lock.json');
                fs.removeSync(packageLockPath);

                // Kill node_modules directory
                const nodeModules = normalizePath(cwd, 'node_modules');
                fs.removeSync(nodeModules);

                const packageJsonPath = normalizePath(cwd, 'package.json');
                const pkg = fs.readJsonSync(packageJsonPath);

                for (const i in plugins) {
                    const nameArr = plugins[i].split('@');
                    nameArr.pop();

                    const name = nameArr.join('@');

                    const pkgPath = normalizePath(
                        `${app}_modules`,
                        name,
                        '_npm',
                    );
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
