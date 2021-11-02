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

const { cwd, inquirer } = arcli.props;

const mod = path.dirname(require.main.filename);
const pkgFile = normalizePath(cwd, 'package.json');
const bytesToSize = require(`${mod}/lib/bytesToSize`);

module.exports = spinner => {
    let bytes, filename, filepath, pkgUpdate;

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
        init: ({ params, props }) => {
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
                const errorMsg = `${chalk.magenta(
                    'Error:',
                )} unable to publish ${chalk.cyan(name)}@${chalk.cyan(
                    version,
                )}}`;

                spinner.fail(errorMsg);
                exit();
            }
        },
        package: ({ params }) => {
            message(`updating ${chalk.cyan('package.json')}...`);
            fs.writeFileSync(pkgFile, JSON.stringify(params.pkg, null, 2));
        },
        prepublish: ({ params, props }) => {
            spinner.stop();

            const actionFiles = globby([`${cwd}/**/arcli-publish.js`]);
            if (actionFiles.length < 1 || !Array.isArray(actionFiles)) return;

            const actions = actionFiles.reduce((obj, file, i) => {
                const acts = require(normalize(file))(spinner);
                Object.keys(acts).forEach(key =>
                    op.set(obj, `prepublish_${i}_${key}`, acts[key]),
                );
                return obj;
            }, {});

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
            fs.copySync(cwd, tmpDir);
        },
        compress: ({ params, props }) => {
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
            ).save();

            message(`publishing ${chalk.cyan(filename)}...`);

            const data = {
                checksum,
                file,
                name: pkg.name,
                organization: op.get(params, 'organization'),
                private: op.get(params, 'private'),
                version: String(pkg.version),
            };

            const result = await Actinium.Cloud.run('registry-publish', data, {
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
