import bytesToSize from '../../../lib/bytesToSize.js';

export default spinner => {
    const {
        _,
        Actinium,
        ActionSequence,
        AuthValidated,
        Session,
        chalk,
        crypto,
        fs,
        globby,
        normalizePath,
        op,
        path,
        tar,
        useSpinner,
    } = arcli;

    const { cwd } = arcli.props;

    const pkgFile = normalizePath(cwd, 'package.json');

    let authorized, bytes, filename, filepath, sessionToken;

    const normalize = normalizePath;

    const { complete, error, exit, info, message, start, stop } = useSpinner(
        spinner,
    );

    return {
        init: async ({ params }) => {
            authorized =
                op.get(params, 'authorized') || (await AuthValidated(params));

            if (!authorized) {
                error('permission denied');
                exit();
                return;
            }
        },
        bail: () => {
            if (!authorized) exit();
        },
        validate: async ({ params, props }) => {
            sessionToken = Session();
            params.sessionToken = sessionToken;

            const { name, version } = params.pkg;

            const result = await Actinium.Cloud.run(
                'registry-check',
                { name, version },
                { sessionToken },
            );

            const canPublish = op.get(result, 'enabled', false);

            if (canPublish !== true) {
                const errorMsg = `${chalk.magenta(
                    'Error:',
                )} unable to publish ${chalk.cyan(name)}@${chalk.cyan(
                    version,
                )}}`;

                error(errorMsg);
                exit();
            }
        },
        package: ({ params }) => {
            message(`updating ${chalk.cyan('package.json')}...`);
            fs.writeFileSync(pkgFile, JSON.stringify(params.pkg, null, 2));
        },
        prepublish: async ({ params, props }) => {
            stop();

            const actionFiles = globby([`${cwd}/**/arcli-publish.js`]);
            if (actionFiles.length < 1 || !Array.isArray(actionFiles)) return;

            const actions = {};

            for (let i = 0; i < actionFiles.length; i++) {
                const filePath = actionFiles[i];
                const mod = await import(normalize(filePath));
                const acts = mod(spinner);
                Object.keys(acts).forEach(key =>
                    op.set(actions, `prepublish_${i}_${key}`, acts[key]),
                );
            }

            return ActionSequence({
                actions,
                options: { params, props },
            }).catch(err => {
                error(`Prepublish Error: ${err}`);
                exit();
            });
        },
        tmp: ({ params }) => {
            const { tmpDir } = params;

            start();

            fs.ensureDirSync(tmpDir);
            fs.emptyDirSync(tmpDir);
            fs.copySync(cwd, tmpDir, {
                filter: (src, dest) => {
                    if (/_npm/.test(src)) return false;
                    return true;
                },
            });
        },
        compress: ({ params }) => {
            const { pkg, tmpDir } = params;

            info(`packaging ${chalk.cyan(pkg.name)}...`);

            console.log('');

            filename = ['reactium-module', 'tgz'].join('.');
            filepath = normalizePath(tmpDir, filename);

            if (fs.existsSync(filepath)) fs.removeSync(filepath);

            bytes = 0;

            const dir = '/' + path.basename(tmpDir) + '/';

            tar.create(
                {
                    file: filepath,
                    filter: (file, stat) => {
                        if (String(file).includes(filename)) return false;
                        if (String(file).endsWith('.DS_Store')) return false;

                        bytes += stat.size;

                        if (String(file).length > 2) {
                            console.log(
                                '   ',
                                bytesToSize(stat.size),
                                chalk.cyan('→'),
                                dir + file,
                            );
                        }
                        return true;
                    },
                    gzip: true,
                    sync: true,
                    cwd: tmpDir,
                },
                ['./', filename],
            );

            const { size } = fs.statSync(filepath);

            console.log('');
            info('compressed', bytesToSize(bytes), '→', bytesToSize(size));
            console.log('');
        },
        publish: async ({ params }) => {
            const { pkg, sessionToken } = params;

            message(`processing ${chalk.cyan(filename)}...`);

            let filedata = fs.readFileSync(filepath);

            const checksum = crypto
                .createHash('sha256')
                .update(filedata)
                .digest('hex');

            message(`uploading ${chalk.cyan(filename)}...`);

            const filedataArray = Array.from(filedata);

            const file = await new Actinium.File(
                `${checksum}.tgz`,
                filedataArray,
            ).save({ sessionToken });

            message(`publishing ${chalk.cyan(filename)}...`);

            const data = {
                checksum,
                file,
                name: pkg.name,
                organization: op.get(params, 'organization'),
                private: op.get(params, 'private'),
                version: String(pkg.version),
                latest: String(pkg.version),
                description: op.get(pkg, 'description'),
            };

            await Actinium.Cloud.run('registry-publish', data, {
                sessionToken,
            }).catch(err => {
                spinner.stop();
                console.log(32, JSON.stringify(err));
            });
        },
        cleanup: ({ params }) => {
            fs.removeSync(params.tmpDir);
        },
        complete: ({ params }) => {
            complete(
                `published ${chalk.cyan(params.pkg.name)} v${chalk.cyan(
                    params.pkg.version,
                )}`,
            );
        },
    };
};
