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

    return {
        init: args => {
            params = op.get(args, 'params');
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
            if (!op.get(params, 'app') === 'electron') return;
        },
        npm: () => {
            Spinner.stop();
            console.log(chalk.cyan('+'), 'Installing', chalk.cyan(DIR), 'dependencies...');
            console.log('');
            return arcli
                .runCommand('npm', ['install'], { cwd: normalize(cwd, DIR) })
                .catch(() => process.exit());
        },
        empty: () => {
            const actions = require(`${mod}/commands/reactium/empty/actions`)(
                Spinner,
            );
            return ActionSequence({
                actions,
                options: {
                    params: {
                        ...params,
                        demo: true,
                        font: true,
                        images: true,
                        style: true,
                        toolkit: true,
                    },
                    props: { ...props, cwd: normalize(cwd, DIR) },
                },
            });
        },
    };
};
