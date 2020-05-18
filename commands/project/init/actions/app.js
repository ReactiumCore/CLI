const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const _ = require('underscore');
const op = require('object-path');
const ActionSequence = require('action-sequence');

const { arcli, Hook, Spinner } = global;
const mod = path.dirname(require.main.filename);

module.exports = () => {
    let params;

    const props = op.get(arcli, 'props');
    const cwd = op.get(arcli, 'props.cwd');
    const normalize = (...args) => path.normalize(path.join(...args));

    return {
        init: args => {
            params = op.get(args, 'params');
        },
        directory: () => {
            Spinner.message('Creating', chalk.cyan('APP'), 'directory...');

            const dir = normalize(cwd, 'APP');

            fs.ensureDirSync(dir);
            fs.emptyDirSync(dir);
        },
        install: () => {
            const actions = require(`${mod}/commands/reactium/install/actions`)(Spinner);
            return ActionSequence({
                actions,
                options: {
                    params,
                    props: { ...props, cwd: normalize(cwd, 'APP') },
                },
            });
        },
        empty: () => {
            const actions = require(`${mod}/commands/reactium/empty/actions`)(Spinner);
            return ActionSequence({
                actions,
                options: {
                    params: {
                        ...params,
                        demo: true,
                        font: true,
                        images: true,
                        style: true,
                        toolkt: true,
                    },
                    props: { ...props, cwd: normalize(cwd, 'APP') },
                },
            });
        },
        electron: () => {
            if (!op.get(params, 'app') === 'electron') return;
        },
    };
};
