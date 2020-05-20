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
        reactium: () => {
            const actions = require(`${mod}/commands/project/init/actions/app`)(
                'ADMIN',
            );
            return ActionSequence({
                actions,
                options: {
                    params,
                    props: { ...props, cwd: normalize(cwd, 'ADMIN') },
                },
            });
        },
        pluginInstall: () =>
            arcli.runCommand('arcli', ['install', '@atomic-reactor/admin'], {
                cwd: normalize(cwd, 'ADMIN'),
            }),
    };
};
