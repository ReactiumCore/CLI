import fs from 'fs-extra';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = fs.readJsonSync(path.resolve(__dirname, '../config.json'));

/**
 * errorFunc(commandName, ...message) Function
 * @description Standardized error function used to pretty up any errors you want to output.
 * @param commandName String The name of the command.
 * @param ...message Arguments passed to the console.log() function.
 * @return Boolean Returns false so that the function can be used as a validation result.
 */
export const error = (commandName, ...message) => {
    const { chalk } = arcli; 

    console.log('');

    console.log(chalk.red('Error:'), commandName);

    console.log('  ', ...message);
    console.log('');

    return false;
};

export const message = (commandName, ...message) => {
    const { chalk } = arcli; 
    
    console.log('');
    console.log(
        chalk.cyan(String(config.prompt.prefix).trim()),
        commandName,
        ...message,
    );
    console.log('');
};
