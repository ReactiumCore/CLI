const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const pkg = require('./package');
const semver = require('semver');
const op = require('object-path');
const request = require('request');
const inquirer = require('inquirer');
const decompress = require('@atomic-reactor/decompress');

module.exports = spinner => {
    let cancelled = false;

    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    const normalize = (...args) => path.normalize(path.join(...args));

    return {
        download: ({ params, props, action }) => {
            const { config, cwd } = props;

            message('downloading payload, this may take awhile...');

            // Create the tmp directory if it doesn't exist.
            fs.ensureDirSync(normalize(cwd, 'tmp', 'update'));

            // Download the most recent version of reactium
            return new Promise((resolve, reject) => {
                request(config.reactium.repo)
                    .pipe(
                        fs.createWriteStream(
                            normalize(cwd, 'tmp', 'reactium.zip'),
                        ),
                    )
                    .on('error', error => {
                        console.log(error);
                        process.exit();
                    })
                    .on('close', () => resolve({ action, status: 200 }));
            });
        },

        unzip: ({ params, props, action }) => {
            const { config, cwd } = props;

            message('unpacking...');

            const zipFile = normalize(cwd, 'tmp', 'reactium.zip');
            const updateDir = normalize(cwd, 'tmp', 'update');

            // Create the update directory
            fs.ensureDirSync(updateDir);

            return new Promise((resolve, reject) => {
                decompress(zipFile, updateDir, { strip: 1 })
                    .then(() => resolve({ action, status: 200 }))
                    .catch(error => reject(error));
            });
        },

        confirm: async ({ props }) => {
            const { config, cwd } = props;

            // Get the updated installed version file
            const { version: updated } = require(normalize(
                cwd,
                'tmp',
                'update',
                '.core',
                'reactium-config',
            ));

            // Get the
            const { version: current } = require(normalize(
                cwd,
                '.core',
                'reactium-config',
            ));

            const diff = semver.diff(current, updated);
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

        core: ({ params, props, action }) => {

            if (cancelled === true) return;

            const { cwd } = props;

            message('updating core...');

            const coreDir = normalize(cwd, '.core');
            const updateDir = normalize(cwd, 'tmp', 'update', '.core');

            fs.ensureDirSync(coreDir);
            fs.emptyDirSync(coreDir);

            return new Promise((resolve, reject) => {
                fs.copy(updateDir, coreDir, error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ action, status: 200 });
                    }
                });
            });
        },

        babel: ({ params, props, action }) => {
            if (cancelled === true) return;

            const { cwd } = props;

            // babel.config.js file
            const babelFilePath = normalize(cwd, 'babel.config.js');

            if (!fs.existsSync(babelFilePath)) {
                const templateFilePath = normalize(
                    __dirname,
                    'template',
                    'babel.config.js',
                );
                const template = fs.readFileSync(templateFilePath);

                fs.writeFileSync(babelFilePath, template);
            }

            return Promise.resolve({ action, status: 200 });
        },

        gulpfile: ({ params, props, action }) => {
            if (cancelled === true) return;

            const { cwd } = props;

            // gulpfile.js file
            const gulpFilePath = normalize(cwd, 'gulpfile.js');
            const templateFilePath = normalize(
                __dirname,
                'template',
                'gulpfile.js',
            );
            const template = fs.readFileSync(templateFilePath);

            fs.writeFileSync(gulpFilePath, template);

            return Promise.resolve({ action, status: 200 });
        },

        package: ({ params, props, action }) => {
            if (cancelled === true) return;

            const { cwd } = props;
            const newPackage = pkg(props, normalize(cwd, 'tmp', 'update'));

            message('updating package.json...');

            const packageFile = normalize(cwd, 'package.json');

            return new Promise((resolve, reject) => {
                fs.writeFile(packageFile, newPackage, 'utf8', error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ action, status: 200 });
                    }
                });
            });
        },

        files: ({ params, props, action }) => {
            if (cancelled === true) return;

            // Add/Remove src files
            const { cwd } = props;
            const reactium = require(normalize(
                cwd,
                'tmp',
                'update',
                '.core',
                'reactium-config',
            ));

            const reactiumVersion = op.get(reactium, 'version');
            const add = op.get(reactium, 'update.files.add') || [];
            const remove = op.get(reactium, 'update.files.remove') || [];

            if (add.length > 0 || remove.length > 0) {
                message('updating app source...');
            } else {
                return Promise.resolve({ action, status: 200 });
            }

            // Remove files from src
            remove
                .filter(({ version }) =>
                    semver.satisfies(reactiumVersion, version),
                )
                .forEach(({ source }) => {
                    source = normalize(cwd, source);
                    if (fs.existsSync(source)) {
                        fs.removeSync(source);
                    }
                });

            // Add files to src
            add.filter(({ version }) =>
                semver.satisfies(reactiumVersion, version),
            ).forEach(({ destination, overwrite, source }) => {
                destination = normalize(cwd, destination);
                source = normalize(cwd, source);
                if (!fs.existsSync(destination) || overwrite === true) {
                    fs.copySync(source, destination);
                }
            });

            return Promise.resolve({ action, status: 200 });
        },

        cleanup: ({ params, props, action }) => {
            const { config, cwd } = props;

            message('removing temp files...');

            return new Promise((resolve, reject) => {
                fs.remove(normalize(cwd, 'tmp'), error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ action, status: 200 });
                    }
                });
            });
        },

        npm: async ({ props }) => {
            if (cancelled === true) return;

            if (spinner) spinner.stop();
            console.log('');
            console.log(
                'Installing',
                chalk.cyan('Reactium'),
                'dependencies...',
            );
            console.log('');
            await arcli.runCommand('arcli', ['install']);
        },

        cancelled: () => {
            if (!cancelled) return;
            console.log('');
            process.exit();
        },
    };
};
