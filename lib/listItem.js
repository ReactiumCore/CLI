
const chalk = require('chalk');
const pad = require('./pad');

module.exports = ({ item, index, padding }) => {
    index += 1;
    let i = chalk.cyan(pad(index, padding) + '.');
    return `\n\t    ${i} ${chalk.white(item)}`;
};
