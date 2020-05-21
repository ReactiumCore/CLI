const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const _ = require('underscore');
const op = require('object-path');
const ActionSequence = require('action-sequence');

const { arcli, Hook, Spinner } = global;

const normalize = arcli.normalizePath;
const mod = path.dirname(require.main.filename);

module.exports = () => {
    let params;

    const props = op.get(arcli, 'props');
    const cwd = op.get(arcli, 'props.cwd');

    return {
        init: args => {
            params = op.get(args, 'params');
        },
        directory: () => {
            Spinner.message('Creating', chalk.cyan('API'), 'directory...');

            const dir = normalize(cwd, 'API');

            fs.ensureDirSync(dir);
            fs.emptyDirSync(dir);
        },
        download: () => {
            const actions = require(`${mod}/commands/actinium/install/actions`)(
                Spinner,
            );
            return ActionSequence({
                actions,
                options: {
                    params,
                    props: { ...props, cwd: normalize(cwd, 'API') },
                },
            });
        },
        npm: () => {
            Spinner.stop();
            console.log(chalk.cyan('+'), 'Installing', chalk.cyan('API'), 'dependencies...');
            console.log('');
            return arcli
                .runCommand('npm', ['install'], { cwd: normalize(cwd, 'API') })
                .catch(() => process.exit());
        },
    };
};
