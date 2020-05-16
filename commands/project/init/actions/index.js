const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const _ = require('underscore');
const op = require('object-path');

module.exports = (arcli) => {
    let cwd, params, props;

    return {
        init: args => {
            arcli = arcli || op.get(args, 'arcli');
            cwd = op.get(args, 'props.cwd');
            params = op.get(args, 'params');
            props = op.get(args, 'props');
        },
        create: () => {
            Spinner.message('Creating', chalk.cyan('something'), '...');
        },
    };
};
