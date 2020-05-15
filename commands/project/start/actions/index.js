const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');

module.exports = () => {
    let Hook, spinner;

    return {
        init: ({ arcli, params, props }) => {
            Hook = op.get(arcli, 'Hook');
            spinner = op.get(arcli, 'spinner');
        },
        create: ({ params, props }) => {
            spinner.message('Creating', chalk.cyan('something'), '...');
        },
    };
};
