const op = require('object-path');
const crypto = require('crypto');
const _ = require('underscore');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const tar = require('tar');

module.exports = spinner => {
    let bytes,
        cwd,
        filename,
        filepath,
        pkg,
        pkgFile,
        pkgUpdate,
        prompt,
        sessionToken;
    const x = chalk.magenta('✖');

    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    const exit = () => {
        console.log('');
        process.exit();
    };

    const pkgPrompt = fields =>
        new Promise((resolve, reject) => {
            const required = true;
            const type = 'string';
            const defaults = {
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
                Object.keys(results).forEach(key =>
                    op.set(pkg, key, results[key]),
                );
                resolve();
            });
        });

    const bytesToSize = bytes => {
        const sizes = ['bytes', 'kb', 'mb', 'gb', 'tb'];
        if (bytes === 0) return chalk.cyan('0 ') + chalk.cyan(sizes[0]);
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return (
            chalk.cyan(Math.round(bytes / Math.pow(1024, i), 2)) +
            ' ' +
            chalk.cyan(sizes[i])
        );
    };

    return {
        init: ({ props }) => {
            cwd = String(props.cwd)
                .split('\\')
                .join('/');
            pkgFile = path.normalize(`${cwd}/package.json`);
            prompt = props.prompt;
            sessionToken = op.get(props, 'config.registry.sessionToken');

            const app = op.get(props, 'config.registry.app', 'Actinium');
            const serverURL = op.get(props, 'config.registry.server');
            Actinium.initialize(app);
            Actinium.serverURL = serverURL;
        },
        package: async ({ action, params, props }) => {
            message(`updating ${chalk.cyan('package.json')}...`);
            const fields = {
                name: chalk.white('Package Name:'),
                description: chalk.white('Description:'),
                author: chalk.white('Author:'),
                'reactium.version': chalk.white('Reactium Version:'),
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
                );
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
                        await pkgPrompt([{ name, description: fields[name] }]);
                        console.log('');
                        spinner.start();
                    }
                }
            }

            // Write new package.json
            pkg.version = params.version;

            let pname = String(pkg.name)
                .toLowerCase()
                .replace(/\s\s+/g, ' ')
                .replace(/ /g, '-')
                .replace(/[^0-9a-z@\-\/]/gi, '');

            pname = pname.startsWith('@reactium-module/')
                ? pname
                : `@reactium-module/${pname}`;

            op.set(pkg, 'name', pname);
            fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
            spinner.start();
        },
        validate: async ({ action, params, props }) => {
            const { name, version } = pkg;

            const canPublish = await Actinium.Cloud.run(
                'registry-check',
                { name, version },
                { sessionToken },
            );

            if (canPublish !== true) {
                spinner.fail(`${chalk.magenta('Error:')} ${canPublish}`);
                exit();
            }
        },
        compress: ({ action, params, props }) => {
            spinner.stopAndPersist({
                symbol: chalk.cyan('+'),
                text: `packaging ${chalk.cyan(pkg.name)}...`,
            });

            filename = ['reactium-module', 'tgz'].join('.');
            filepath = path.normalize(path.join(cwd, filename));

            if (fs.existsSync(filepath)) fs.removeSync(filepath);

            bytes = 0;

            const dir = '/' + path.basename(cwd) + '/';

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
                },
                ['./', filename],
            );

            const { size } = fs.statSync(filepath);

            console.log(chalk.cyan('+'), 'compressed', bytesToSize(bytes), '→', bytesToSize(size));
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
            filedata = Array.from(filedata);
            const file = await new Actinium.File(`reactium-module.${checksum}.tgz`, filedata).save();

            message(`publishing ${chalk.cyan(filename)}...`);

            const data = {
                checksum,
                file: file.url(),
                name: pkg.name,
                private: params.private,
                version: String(pkg.version),
            };

            const result = await Actinium.Cloud.run('registry-publish', data, {
                sessionToken,
            });

            spinner.stopAndPersist({
                symbol: chalk.green('✔'),
                text: `published ${chalk.cyan(pkg.name)} v${chalk.cyan(pkg.version)}`
            });
        },
        cleanup: () => {
            fs.removeSync(filepath);
        }
    };
};
