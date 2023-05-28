import targetApp from '../../../lib/targetApp.js';
import { ActiniumInit, Session } from '../../../lib/auth.js';

export default (spinner, app) => {
    let config, dir, filepath, name, plugin, sessionToken, tmp, version;

    const { cwd } = arcli.props;

    const {
        _,
        ActionSequence,
        chalk,
        deleteEmpty,
        fs,
        globby,
        op,
        path,
        request,
        tar,
    } = arcli;

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
        prep: async ({ params }) => {
            app = app || targetApp(cwd);

            config = arcli.props.config;

            sessionToken = Session();

            name = op.get(params, 'name');

            if (!name) {
                spinner.fail('input plugin name');
                process.exit(1);
            }

            name = _.compact(String(name).split('@'))[0];
            name =
                String(params.name).substring(0, 1) === '@' ? `@${name}` : name;

            dir = normalize(cwd, app + '_modules', slugify(name));

            // Ensure module dir
            fs.ensureDirSync(normalize(cwd, app + '_modules'));

        },
        init: ({ params }) => {
            ActiniumInit({
                app: op.get(params, 'app', op.get(config, 'registry.app')),
                server: op.get(
                    params,
                    'server',
                    op.get(config, 'registry.server'),
                ),
            });
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
            message(
                `Fetching ${chalk.cyan('plugin')} ${chalk.magenta(name)}...`,
            );

            return Actinium.Cloud.run(
                'registry-get',
                { name, serialized: true },
                { sessionToken },
            )
                .then(result => {
                    plugin = result;
                    if (!plugin) {
                        throw new Error(
                            `  Unable to get plugin: ${name}@${version}.`,
                        );
                    }
                })
                .catch(err => {
                    spinner.fail(
                        `Error fetching ${chalk.cyan('plugin')} ${chalk.magenta(
                            name,
                        )}:`,
                    );
                    console.error(chalk.magenta(err.message));
                    console.log('');
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
                spinner.fail(`Error installing ${chalk.cyan(name)}:`);
                console.error(
                    `  Unable to find plugin version: ${chalk.magenta(
                        version,
                    )}`,
                );
                console.log('');
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
            const pkg = fs.readJsonSync(pkgjson);
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
                text: `Installing ${chalk.cyan('npm')} dependencies...`,
                symbol: chalk.cyan('+'),
            });

            console.log('');

            try {
                await arcli.runCommand('npm', ['prune']);
                await arcli.runCommand('npm', ['install']);
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

            const actions = {};

            for (let i = 0; i < actionFiles.length; i++) {
                const file = actionFiles[i];
                const mod = await import(normalize(file));
                const acts = mod(spinner, arcli, params, props);
                Object.keys(acts).forEach(key =>
                    op.set(actions, `postinstall_${i}_${key}`, acts[key]),
                );
            }

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
