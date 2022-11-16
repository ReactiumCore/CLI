import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import semver from 'semver';
import op from 'object-path';
import request from 'request';
import inquirer from 'inquirer';
import decompress from '@atomic-reactor/decompress';
import pkg from './package.json' assert { type: 'json'};

export default spinner => {
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

            const { cwd } = props;
            const { tag } = params;

            // Create the tmp directory.
            fs.ensureDirSync(normalize(cwd, 'tmp', 'update'));

            // Get the download url
            let URL = String(
                op.get(
                    props,
                    'config.actinium.repo',
                    'https://github.com/Atomic-Reactor/Actinium/archive/master.zip',
                ),
            );
            if (tag && tag !== 'latest' && URL.endsWith('/master.zip')) {
                URL = URL.replace('/master.zip', `/refs/tags/${tag}.zip`);
            }

            // Download the most recent version of actinium
            return new Promise((resolve, reject) => {
                request(URL)
                    .pipe(
                        fs.createWriteStream(
                            normalize(cwd, 'tmp', 'update', 'actinium.zip'),
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
            message('unpacking...');

            const { config, cwd } = props;

            const zipFile = normalize(cwd, 'tmp', 'update', 'actinium.zip');
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
            fs.copySync(updateDir, coreDir);
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

            if (add.length < 1 && remove.length < 1) return;
            message('updating files...');

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
            console.log(`Installing ${chalk.cyan('Actinium')} dependencies...`);
            console.log('');

            return arcli.runCommand('arcli', ['install', '-s']);
        },

        cancelled: () => {
            if (!cancelled) return;
            console.log('');
            process.exit();
        },
    };
};
