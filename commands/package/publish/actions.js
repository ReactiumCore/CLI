const tar = require('tar');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const _ = require('underscore');
const crypto = require('crypto');
const globby = require('globby').sync;
const op = require('object-path');
const mod = path.dirname(require.main.filename);
const ActionSequence = require('action-sequence');
const bytesToSize = require(`${mod}/lib/bytesToSize`);

module.exports = spinner => {
    let bytes,
        cwd,
        filename,
        filepath,
        pkg,
        pkgFile,
        pkgUpdate,
        prompt,
        sessionToken,
        tmpDir;

    const x = chalk.magenta('✖');

    const normalize = (...args) => path.normalize(path.join(...args));

    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    const exit = () => {
        console.log('');
        process.exit(1);
    };

    const pkgPrompt = fields =>
        new Promise((resolve, reject) => {
            const required = true;
            const type = 'string';
            const defaults = {
                actinium: {
                    version: '3.6.6',
                },
                reactium: {
                    version: '3.2.6',
                },
                version: '0.0.1',
            };
            const schema = fields.map(({ description, name }) => ({
                default: op.get(defaults, name),
                description,
                message: `${chalk.cyan.bold(name)} ${chalk.white(
                    'is required',
                )}`,
                name,
                required,
                type,
            }));

            prompt.start();
            prompt.get(schema, (err, results) => {
                if (err) {
                    console.log(err);
                    process.exit();
                    return;
                }
                Object.keys(results).forEach(key =>
                    op.set(pkg, key, results[key]),
                );
                resolve();
            });
        });

    return {
        init: ({ props }) => {
            cwd = String(props.cwd)
                .split('\\')
                .join('/');

            pkgFile = path.normalize(`${cwd}/package.json`);
            prompt = props.prompt;
            sessionToken = op.get(props, 'config.registry.sessionToken');
            tmpDir = normalize(
                require('os').homedir(),
                '.arcli',
                'tmp',
                'publish',
                path.basename(cwd),
            );

            const appID = op.get(
                props,
                'config.registry.app',
                'ReactiumRegistry',
            );
            const serverURL = op.get(
                props,
                'config.registry.server',
                'https://v1.reactium.io/api',
            );

            Actinium.initialize(appID);
            Actinium.serverURL = serverURL;
        },
        package: async ({ action, params, props }) => {
            message(`updating ${chalk.cyan('package.json')}...`);
            const fields = {
                name: chalk.white('Package Name:'),
                description: chalk.white('Description:'),
                author: chalk.white('Author:'),
                'reactium.version': chalk.white('Reactium Version:'),
                'actinium.version': chalk.white('Actinium Version:'),
            };

            // Check for package.json
            if (!fs.existsSync(pkgFile)) {
                pkg = {
                    license: 'ISC',
                    main: 'index.js',
                    scripts: {
                        test: 'echo "Error: no test specified" && exit 1',
                    },
                    keywords: ['reactium'],
                };

                const text = [
                    chalk.magenta.bold('Error:'),
                    chalk.cyan('package.json'),
                    'not found in',
                    chalk.magenta('/' + path.basename(cwd)),
                ].join(' ');

                pkgUpdate = true;
                spinner.stopAndPersist({ symbol: x, text });

                console.log('');
                await pkgPrompt(
                    Object.entries(fields).map(([name, description]) => ({
                        name,
                        description,
                    })),
                ).catch(err => {
                    console.log(33, JSON.stringify(err));
                });
                console.log('');

                spinner.start();
            } else {
                // get package.json file
                pkg = require(pkgFile);

                // required package.json fields
                const reqs = [
                    'name',
                    'version',
                    'description',
                    'author',
                    'reactium.version',
                    'actinium.version'
                ];

                for (let i in reqs) {
                    const name = reqs[i];

                    if (!op.get(pkg, name)) {
                        const text = [
                            chalk.magenta.bold('Error:'),
                            chalk.cyan('package.json'),
                            '→',
                            chalk.magenta(name),
                            'is required',
                        ].join(' ');

                        pkgUpdate = true;
                        spinner.stopAndPersist({ symbol: x, text });
                        console.log('');
                        await pkgPrompt([
                            { name, description: fields[name] },
                        ]).catch(err => {
                            console.log(34, JSON.stringify(err));
                        });
                        console.log('');
                        spinner.start();
                    }
                }
            }

            // Write new package.json
            pkg.version = params.version;

            const pname = String(pkg.name)
                .toLowerCase()
                .replace(/\s\s+/g, ' ')
                .replace(/[^0-9a-z@\-\/]/gi, '-');

            op.set(pkg, 'name', pname);
            fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
            spinner.start();
        },
        validate: async ({ action, params, props }) => {
            const { name, version } = pkg;

            const result = await Actinium.Cloud.run(
                'registry-check',
                { name, version },
                { sessionToken },
            );

            const canPublish = op.get(result, 'enabled');

            if (canPublish !== true) {
                const errorMsg = `${chalk.magenta('Error:')} ${JSON.stringify(canPublish)}`;
                spinner.fail(
                    errorMsg,
                );

                console.error(errorMsg);
                exit();
            }
        },
        prepublish: async ({ params, props }) => {
            const actionFiles = globby([`${props.cwd}/**/arcli-publish.js`]);
            if (actionFiles.length < 1 || !Array.isArray(actionFiles)) return;

            const actions = actionFiles.reduce((obj, file, i) => {
                const acts = require(normalize(file))(spinner);
                Object.keys(acts).forEach(key =>
                    op.set(obj, `prepublish_${i}_${key}`, acts[key]),
                );
                return obj;
            }, {});

            await ActionSequence({ actions, options: { params, props } }).catch(
                err => {
                    console.log('Prepublish Error:', err);
                    exit();
                },
            );
        },
        tmp: () => {
            spinner.stop();
            fs.ensureDirSync(tmpDir);
            fs.emptyDirSync(tmpDir);
            fs.copySync(cwd, tmpDir);
        },
        transform: () => {
            spinner.start();
            message(`Compiling...`);

            const regex = new RegExp(`components/${path.basename(cwd)}`, 'g');
            const replacerReactium = `reactium_modules/${pkg.name}`;
            const files = globby([
                `${tmpDir}/**/*.js`,
                `${tmpDir}/**/*.jsx`,
                `!${tmpDir}/**/*.json`,
            ]);

            for (const i in files) {
                const file = files[i];
                let content = fs.readFileSync(file);
                content = String(content).replace(regex, replacerReactium);
                fs.writeFileSync(file, content);
            }
        },
        compress: ({ action, params, props }) => {
            spinner.stopAndPersist({
                symbol: chalk.cyan('+'),
                text: `packaging ${chalk.cyan(pkg.name)}...`,
            });

            filename = ['reactium-module', 'tgz'].join('.');
            filepath = path.normalize(path.join(tmpDir, filename));

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
            spinner.start();
        },
        publish: async ({ action, params, props }) => {
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
        cleanup: () => {
            fs.removeSync(tmpDir);
        },
        complete: () => {
            spinner.succeed(
                `published ${chalk.cyan(pkg.name)} v${chalk.cyan(pkg.version)}`,
            );
        },
    };
};
