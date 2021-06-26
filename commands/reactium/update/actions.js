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
            const { cwd } = props;
            const { tag } = params;

            message('downloading payload, this may take awhile...');

            // Create the tmp directory if it doesn't exist.
            fs.ensureDirSync(normalize(cwd, 'tmp', 'update'));

            // Get the download url
            let URL = String(
                op.get(
                    props,
                    'config.reactium.repo',
                    'https://github.com/Atomic-Reactor/Reactium/archive/master.zip',
                ),
            );
            if (tag && tag !== 'latest' && URL.endsWith('/master.zip')) {
                URL = URL.replace('/master.zip', `/refs/tags/${tag}.zip`);
            }

            // Download the most recent version of reactium
            return new Promise((resolve, reject) => {
                request(URL)
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

            // Extract contents
            return decompress(zipFile, updateDir, { strip: 1 });
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
            fs.copySync(updateDir, coreDir);
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

            if (add.length < 1 && remove.length < 1) return;
            message('updating files...');

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
        },

        package: ({ params, props, action }) => {
            if (cancelled === true) return;

            message('updating package.json...');

            const { cwd } = props;
            const newPackage = pkg(props, normalize(cwd, 'tmp', 'update'));
            const oldPackage = normalize(cwd, 'package.json');

            fs.writeFileSync(oldPackage, newPackage);
        },

        cleanup: ({ params, props, action }) => {
            const { cwd } = props;
            message('removing temp files...');
            fs.removeSync(normalize(cwd, 'tmp'));
        },

        deps: ({ props }) => {
            if (cancelled) return;
            if (spinner) spinner.stop();

            console.log('');
            console.log(`Installing ${chalk.cyan('Reactium')} dependencies...`);
            console.log('');

            return arcli.runCommand('arcli', ['install']);
        },

        cancelled: () => {
            if (!cancelled) return;
            console.log('');
            process.exit();
        },
    };
};
