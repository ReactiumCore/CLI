import pkg, { normalize, getUpdatedConfig } from './package.js';

const PAYLOAD = {
    Reactium: [
        'config.reactium.repo',
        'https://github.com/Atomic-Reactor/Reactium/archive/master.zip',
    ],
    Actinium: [
        'config.actinium.repo',
        'https://github.com/Atomic-Reactor/Actinium/archive/master.zip',
    ],
};

export default spinner => {
    let cancelled = false;

    const {
        path,
        chalk,
        decompress,
        fs,
        semver,
        op,
        request,
        inquirer,
    } = arcli;

    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    return {
        download: ({ params, props, action }) => {
            const { cwd } = props;
            const { tag, type } = params;

            message('downloading payload, this may take awhile...');

            // Create the tmp directory if it doesn't exist.
            fs.ensureDirSync(normalize(cwd, 'tmp', 'update'));

            // Get the download url
            let URL = String(op.get(props, ...PAYLOAD[type]));
            if (tag && tag !== 'latest' && URL.endsWith('/master.zip')) {
                URL = URL.replace('/master.zip', `/refs/tags/${tag}.zip`);
            }

            // Download the most recent version of reactium
            const payloadStream = fs.createWriteStream(
                normalize(cwd, 'tmp', 'payload.zip'),
            );
            return arcli.axios
                .get(URL, { responseType: 'stream' })
                .then(({ data }) => {
                    return new Promise((resolve, reject) => {
                        data.pipe(payloadStream);

                        data.on('error', error => {
                            console.log(error);
                            reject(error);
                            process.exit(1);
                        });

                        data.on('close', () =>
                            resolve({ action, status: 200 }),
                        );
                    });
                })
                .then(async res => {
                    message('downloading core, this may take awhile...');

                    await arcli.runCommand('reactium', [
                        'install',
                        `@atomic-reactor/${params.type.toLowerCase()}-core`,
                    ]);

                    return res;
                });
        },

        unzip: ({ props }) => {
            const { config, cwd } = props;

            message('unpacking...');

            const zipFile = normalize(cwd, 'tmp', 'payload.zip');
            const updateDir = normalize(cwd, 'tmp', 'update');

            // Create the update directory
            fs.ensureDirSync(updateDir);

            // Extract contents
            return decompress(zipFile, updateDir, { strip: 1 });
        },

        confirm: async ({ params, props }) => {
            const { cwd } = props;
            const { type, originalConfigFile } = params;

            // Get the updated installed version file
            const { default: updated } = await import(
                `file://${getUpdatedConfig({ params, props })}`
            );
            params.project = updated;

            // Get the current configig
            const { default: current } = await import(
                `file://${originalConfigFile}`
            );
            params.currentConfig = current;

            const diff = semver.diff(current.version, updated.version);
            const warnings = ['major', 'minor'];

            if (!warnings.includes(diff)) return;

            if (spinner) spinner.stop();
            console.log(
                ` ${chalk.bold.magenta('Warning')}: version ${chalk.magenta(
                    updated,
                )} is a ${chalk.cyan(diff)} update!`,
            );

            const { resume } = await inquirer.prompt([
                {
                    type: 'confirm',
                    prefix: chalk.magenta('   > '),
                    suffix: chalk.magenta(': '),
                    name: 'resume',
                    default: false,
                    message: chalk.cyan('Continue?'),
                },
            ]);

            cancelled = !resume;
        },

        core: ({ params, props }) => {
            if (cancelled === true) return;

            const { cwd } = props;

            message('updating core...');

            // Old Core locationo
            const coreDir = normalize(cwd, '.core');
            fs.emptyDirSync(coreDir);
        },

        files: async ({ params, props }) => {
            if (cancelled === true) return;

            // Add/Remove src files
            const { type, project } = params;
            const { cwd } = props;

            params.updateBaseDir = normalize(cwd, 'tmp', 'update');

            const projectVersion = op.get(project, 'version');
            const add = op.get(project, 'update.files.add') || [];
            const remove = op.get(project, 'update.files.remove') || [];

            if (add.length < 1 && remove.length < 1) return;
            message('updating files...');

            // Remove files from src
            remove
                .filter(({ version }) =>
                    semver.satisfies(projectVersion, version),
                )
                .forEach(({ source }) => {
                    source = normalize(cwd, source);
                    if (fs.existsSync(source)) {
                        fs.removeSync(source);
                    }
                });

            // Add files to src
            add.filter(({ version }) =>
                semver.satisfies(projectVersion, version),
            ).forEach(({ destination, overwrite, source }) => {
                destination = normalize(cwd, destination);
                source = normalize(cwd, source);
                if (!fs.existsSync(destination) || overwrite === true) {
                    fs.copySync(source, destination);
                }
            });
        },

        package: async ({ params, props }) => {
            if (cancelled === true) return;

            message('updating package.json...');

            const { cwd } = props;
            const newPackage = await pkg(
                { props, params },
                normalize(cwd, 'tmp', 'update'),
            );
            const oldPackage = normalize(cwd, 'package.json');

            fs.writeFileSync(oldPackage, newPackage);
        },

        cleanup: ({ props }) => {
            const { cwd } = props;
            message('removing temp files...');
            fs.removeSync(normalize(cwd, 'tmp'));
        },

        deps: ({ params }) => {
            try {
                const { quick, type } = params;

                if (cancelled || quick) return;
                if (spinner) spinner.stop();

                console.log('');
                console.log(`Installing ${chalk.cyan(type)} dependencies...`);
                console.log('');

                return arcli.runCommand('reactium', ['install']);
            } catch (msg) {
                console.error(msg);
            }
        },

        cancelled: () => {
            if (!cancelled) return;
            console.log('');
            process.exit();
        },
    };
};
