import Actions from './actions.js';
import { detect } from '../../update/package.js';

export default spinner => {
    let deps, plugins;

    const { cwd } = arcli.props;

    const {
        _,
        ActionSequence,
        chalk,
        fs,
        normalizePath,
        op,
        path,
        useSpinner,
    } = arcli;

    let app;

    const pluginsDir = path.resolve(normalizePath(cwd, app + '_modules'));

    const { complete, info, message, stop } = useSpinner(spinner);

    return {
        init: async ({ params, props }) => {
            const [type] = await detect({ params, props });
            app = type.toLowerCase();

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
            const actions = Actions(spinner);

            op.del(actions, 'complete');
            op.del(actions, 'registerPkg');

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

            complete(`Downloaded ${chalk.cyan('plugins')}`);
        },
        npm: async ({ params }) => {
            if (op.get(params, 'npm') !== true) return;

            info(
                `Installing ${chalk.cyan('npm')} dependencies...`,
                chalk.cyan('+'),
            );

            // Run npm install
            try {
                stop();
                await arcli.runCommand('npm', ['prune']);
                await arcli.runCommand('npm', ['install']);
                console.log('');
            } catch (error) {
                error(error);
                process.exit(1);
            }
        },
        postinstall: async ({ params, props }) => {
            if (op.get(params, 'npm') !== true) return;
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
            plugins.forEach(plugin => console.log('   ', chalk.cyan(plugin)));
        },
    };
};
