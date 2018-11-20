
const path       = require('path');
const chalk      = require('chalk');
const fs         = require('fs-extra');
const op         = require('object-path');
const handlebars = require('handlebars').compile;


module.exports = (spinner) => {
    const message = (text) => {
        if (spinner) {
            spinner.text = text;
        }
    };

    return {
        empty: ({ action, params }) => {

            message(`Emptying ${chalk.cyan('Reactium')}...`);

            return new Promise((resolve, reject) => {

                resolve({ action, status: 200 });
            });
        },
    };
};
