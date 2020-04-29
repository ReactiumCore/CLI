const op = require('object-path');
const _ = require('underscore');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const tar = require('tar');

module.exports = spinner => {
    let bytes, cwd, filename, pkg, pkgFile, pkgUpdate, prompt, sessionToken;
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
            const schema = fields.map(({ description, name }) => ({
                description,
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
        },
        package: async ({ action, params, props }) => {
            message(`checking ${chalk.cyan('package.json')}...`);
            const fields = {
                name: chalk.white('Package Name:'),
                version: chalk.white('Version:'),
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
            if (!pkgUpdate) return;
            fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
        },
        compress: ({ action, params, props }) => {
            //message(`packaging ${chalk.cyan(path.basename(cwd))}...`);
            spinner.stopAndPersist({
                symbol: chalk.cyan('+'),
                text: `packaging ${chalk.cyan(path.basename(cwd))}...`,
            });

            filename = ['reactium-module', 'tgz'].join('.');
            const filepath = path.normalize(path.join(cwd, filename));

            if (fs.existsSync(filepath)) {
                fs.removeSync(filepath);
            }

            bytes = 0;

            let dir = '/'+path.basename(cwd)+'/';

            return tar.create(
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
                                file.split(dir)[0],
                            );
                        }
                        return true;
                    },
                    gzip: true,
                    sync: true,
                },
                ['./', filename],
            );
        },
        upload: ({ action, params, props }) => {

            console.log(chalk.cyan('+'), 'packaged', bytesToSize(bytes));
            console.log('');

            spinner.start();
            message(`uploading ${chalk.cyan(filename)}...`);
        },
    };
};
