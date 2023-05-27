import bytesToSize from '../../../lib/bytesToSize.js';

export default spinner => {
    const {
        _,
        Actinium,
        ActionSequence,
        chalk,
        crypto,
        fs,
        globby,
        normalizePath,
        op,
        path,
        tar,
    } = arcli;

    const { cwd } = arcli.props;

    const pkgFile = normalizePath(cwd, 'package.json');

    let bytes, filename, filepath;

    const x = chalk.magenta('✖');

    const normalize = normalizePath;

    const message = text => {
        if (spinner) {
            if (!spinner.isSpinning) spinner.start();
            spinner.text = text;
        }
    };

    const exit = () => {
        console.log('');
        process.exit(1);
    };

    return {
        init: ({ params }) => {
            const { appID, serverURL } = params;
            Actinium.initialize(appID);
            Actinium.serverURL = serverURL;
        },
        validate: async ({ params, props }) => {
            const { sessionToken } = params;
            const { name, version } = params.pkg;

            const result = await Actinium.Cloud.run(
                'registry-check',
                { name, version },
                { sessionToken },
            );

            const canPublish = op.get(result, 'enabled', false);

            if (canPublish !== true) {
                // prettier-ignore
                const errorMsg = `${chalk.magenta('Error:')} unable to publish ${chalk.cyan(name)}@${chalk.cyan(version)}`;

                spinner.fail(errorMsg);
                exit();
            }
        },
        package: ({ params }) => {
            message(`updating ${chalk.cyan('package.json')}...`);
            fs.writeFileSync(pkgFile, JSON.stringify(params.pkg, null, 2));
        },
        prepublish: async ({ params, props }) => {
            spinner.stop();

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
                spinner.stopAndPersist({
                    symbol: x,
                    text: `Prepublish Error: ${err}`,
                });
                exit();
            });
        },
        tmp: ({ params }) => {
            const { tmpDir } = params;

            if (!spinner.isSpinning) spinner.start();

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

            spinner.stopAndPersist({
                symbol: chalk.cyan('+'),
                text: `packaging ${chalk.cyan(pkg.name)}...`,
            });
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
            console.log(
                chalk.cyan('+'),
                'compressed',
                bytesToSize(bytes),
                '→',
                bytesToSize(size),
            );
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
            spinner.succeed(
                `published ${chalk.cyan(params.pkg.name)} v${chalk.cyan(
                    params.pkg.version,
                )}`,
            );
        },
    };
};
