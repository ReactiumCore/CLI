const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const _ = require('underscore');
const op = require('object-path');

const { arcli, Hook, Spinner } = global;

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
            Spinner.message('Creating', chalk.cyan('app'), 'directory...');

            const dir = normalize(cwd, 'APP');

            fs.ensureDirSync(dir);
            fs.emptyDirSync(dir);
        },
        electron: () => {
            if (!op.get(params, 'app') === 'electron') return;
        },
    };
};
