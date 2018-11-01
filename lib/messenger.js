

const chalk = require('chalk');
const config = require('../config.json');

/**
 * errorFunc(commandName, ...message) Function
 * @description Standardized error function used to pretty up any errors you want to output.
 * @param commandName String The name of the command.
 * @param ...message Arguments passed to the console.log() function.
 * @return Boolean Returns false so that the function can be used as a validation result.
 */
const error = (commandName, ...message) => {
    console.log('');

    console.log(chalk.red('Error:'), commandName);

    console.log('  ', ...message);
    console.log('');

    return false;
};

const message = (commandName, ...message) => {
    console.log('');
    console.log(chalk.cyan(String(config.prompt.prefix).trim()), commandName, ...message);
    console.log('');
};

module.exports = {
    message,
    error,
};
