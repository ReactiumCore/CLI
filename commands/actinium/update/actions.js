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
            message('downloading payload, this may take awhile...');

            const { config, cwd } = props;

            // Create the tmp directory.
            fs.ensureDirSync(normalize(cwd, 'tmp', 'update'));

            // Download the most recent version of actinium
            return new Promise((resolve, reject) => {
                request(config.actinium.repo)
                    .pipe(
                        fs.createWriteStream(
                            normalize(cwd, 'tmp', 'update', 'actinium.zip'),
                        ),
                    )
                    .on('error', error => reject(error))
                    .on('close', () => resolve({ action, status: 200 }));
            });
        },

        unzip: ({ params, props, action }) => {
            message('unpacking...');

            const { config, cwd } = props;

            const zipFile = normalize(cwd, 'tmp', 'update', 'actinium.zip');
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
                'actinium-config',
            ));

            // Get the
            const { version: current } = require(normalize(
                cwd,
                '.core',
                'actinium-config',
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

            message('updating core...');

            const { cwd } = props;

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

        files: ({ params, props, action }) => {
            if (cancelled === true) return;

            // Add/Remove src files
            const { cwd } = props;
            const actinium = require(normalize(
                cwd,
                'tmp',
                'update',
                '.core',
                'actinium-config',
            ));
            const actiniumVersion = op.get(actinium, 'version');
            const add = op.get(actinium, 'update.files.add') || [];
            const remove = op.get(actinium, 'update.files.remove') || [];

            if (add.length > 0 || remove.length > 0) {
                message('updating files...');
            } else {
                return Promise.resolve({ action, status: 200 });
            }

            // Remove files from src
            remove
                .filter(({ version }) =>
                    semver.satisfies(actiniumVersion, version),
                )
                .forEach(({ source }) => {
                    source = normalize(cwd, src);
                    if (fs.existsSync(source)) {
                        fs.removeSync(source);
                    }
                });

            // Add files to src
            add.filter(({ version }) =>
                semver.satisfies(actiniumVersion, version),
            ).forEach(({ destination, overwrite, source }) => {
                destination = normalize(cwd, destination);
                source = normalize(cwd, source);
                if (!fs.existsSync(destination) || overwrite === true) {
                    fs.copySync(source, destination);
                }
            });

            return Promise.resolve({ action, status: 200 });
        },

        package: ({ params, props, action }) => {
            if (cancelled === true) return;

            message('updating package.json...');

            const { cwd } = props;
            const newPackage = pkg(props, normalize(cwd, 'tmp', 'update'));
            const oldPackage = normalize(cwd, 'package.json');

            fs.writeFileSync(oldPackage, newPackage);

            return Promise.resolve({ action, status: 200 });
        },

        cleanup: ({ params, props, action }) => {
            message('removing temp files...');

            const { cwd } = props;

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
                chalk.cyan('Actinium'),
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
