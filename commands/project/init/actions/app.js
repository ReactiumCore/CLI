const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const _ = require('underscore');
const op = require('object-path');
const ActionSequence = require('action-sequence');

const { arcli, Hook, Spinner } = global;

const normalize = arcli.normalizePath;
const mod = path.dirname(require.main.filename);

module.exports = (DIR = 'APP') => {
    let params;

    const props = op.get(arcli, 'props');
    const cwd = op.get(arcli, 'props.cwd');

    let isElectron;

    return {
        init: args => {
            params = op.get(args, 'params');
            isElectron = Boolean(op.get(params, 'app') === 'electron');
        },
        directory: () => {
            Spinner.message('Creating', chalk.cyan(DIR), 'directory...');

            const dir = normalize(cwd, DIR);

            fs.ensureDirSync(dir);
            fs.emptyDirSync(dir);
        },
        download: () => {
            const actions = require(`${mod}/commands/reactium/install/actions`)(
                Spinner,
            );
            return ActionSequence({
                actions,
                options: {
                    params,
                    props: { ...props, cwd: normalize(cwd, DIR) },
                },
            });
        },
        electron: () => {
            if (!isElectron) return;

            const gulpOverridePath = normalize(
                cwd,
                DIR,
                'gulp.config.override.example.js',
            );
            const renamed = String(gulpOverridePath).replace('.example', '');

            if (!fs.existsSync(gulpOverridePath)) return;
            fs.moveSync(gulpOverridePath, renamed);
        },
        electronPkg: () => {
            if (!isElectron) return;

            const pkgPath = normalize(cwd, DIR, 'package.json');
            const pkg = require(pkgPath);

            op.set(
                pkg,
                'scripts.local',
                'cross-env NODE_ENV=development arcli electron-run -e cwd/build-electron -u cwd',
            );
            op.set(pkg, 'scripts.electron:build', 'arcli electron-build');
            op.set(pkg, 'dependencies.electron', '^9.0.0');

            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        },
        npm: () => {
            Spinner.stop();
            console.log(
                chalk.cyan('+'),
                'Installing',
                chalk.cyan(DIR),
                'dependencies...',
            );
            console.log('');
            return arcli
                .runCommand('npm', ['install'], { cwd: normalize(cwd, DIR) })
                .catch(() => process.exit());
        },
        electronBuild: () => {
            if (!isElectron) return;
            console.log('');
            Spinner.stopAndPersist({
                text: ['Building', chalk.cyan('Electron'), 'app...'].join(' '),
                symbol: chalk.cyan('+'),
            });
            console.log('');

            const actions = require(`${cwd}/${DIR}/.core/.cli/commands/electron/builder/actions.js`)(
                Spinner,
            );
            return ActionSequence({
                actions,
                options: {
                    params: {},
                    props: { ...props, cwd: normalize(cwd, DIR) },
                },
            });
        }
    };
};
