/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

const op        = require('object-path');
const fs        = require('fs-extra');
const path      = require('path');
const prettier  = require('prettier');
const camelCase = require('camelcase');
const chalk     = require('chalk');
const slugify   = require('slugify');
const generator = require('./generator');
const mod       = path.dirname(require.main.filename);
const listItem  = require(`${mod}/lib/listItem`);

const {
    error,
    message
} = require(`${mod}/lib/messenger`);


const types = ['Boolean', 'Number', 'String', 'Array', 'Object'];

/**
 * NAME String
 * @description Constant defined as the command name. Value passed to the commander.command() function.
 * @example $ arcli config:set --key 'reactium.repo' --value 'https://github.com/Atomic-Reactor/Reactium/archive/master.zip'
 * @see https://www.npmjs.com/package/commander#command-specific-options
 * @since 2.0.0
 */
const NAME = 'config';


/**
 * DESC String
 * @description Constant defined as the command description. Value passed to
 * the commander.desc() function. This string is also used in the --help flag output.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const DESC = 'ARCLI:    Set ARCLI key:value pairs.';


/**
 * CANCELED String
 * @description Message sent when the command is canceled
 * @since 2.0.0
 */
const CANCELED = 'Config update canceled!';


/**
 * conform(input:Object) Function
 * @description Reduces the input object.
 * @param input Object The key value pairs to reduce.
 * @since 2.0.0
 */
const CONFORM = (input) => {

    let output = {};

    Object.entries(input).forEach(([key, val]) => {
        switch (key) {
            case 'type':
                val = String(val).toLowerCase();
                if (!types.join(' ').toLowerCase().split(' ').includes(val)) {
                    val = 'string';
                }
                output[key] = val;
                break;

            default:
                output[key] = val;
                break;
        }
    });

    let value = op.get(output, 'value', undefined);
    const type = op.get(output, 'type', 'string');

    if (value) {
        switch (type) {
            case 'array':
            case 'object':
                value = JSON.parse(value);
                break;

            case 'number':
                value = (!isNaN(value)) ? Number(value) : undefined;
                break;

            default:
                value = String(value);
                break;
        }

        output.value = value;
    }

    return output;
};


/**
 * confirm({ props:Object, params:Object }) Function
 * @description Prompts the user to confirm the operation
 * @since 2.0.0
 */
const CONFIRM = ({ props, params }) => {
    const { prompt } = props;

    return new Promise((resolve, reject) => {
        prompt.get({
            properties: {
                confirmed: {
                    description: `${chalk.white('Editing the config is risky business... Are you sure?')} ${chalk.cyan('(Y/N):')}`,
                    type: 'string',
                    required: true,
                    pattern: /^y|n|Y|N/,
                    before: (val) => {
                        return (String(val).toLowerCase() === 'y');
                    }
                }
            }
        }, (err, { confirmed }) => {
            if (err || !confirmed) {
                reject();
            } else {
                resolve(confirmed);
            }
        });
    });
};


/**
 * HELP Function
 * @description Function called in the commander.on('--help', callback) callback.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const HELP = () => {
    console.log('');
    console.log('Example:');
    console.log('');
    console.log(`   $ arcli ${NAME} --key 'reactium.repo' --value 'https://github.com/Atomic-Reactor/Reactium/archive/master.zip'`);
    console.log('');
};


/**
 * SCHEMA Object
 * @description used to describe the input for the prompt function.
 * @see https://www.npmjs.com/package/prompt
 * @since 2.0.0
 */
const SCHEMA = ({ props }) => {

    const typeList = types.map((item, index) => listItem({
        item, index, padding: String(types.length).length
    })).join('');

    return {
        properties: {
            key: {
                description: chalk.white('Key:'),
                required: true,
                pattern: /^[a-zA-Z\_\-\.]+$/,
                type: 'string',
                message: 'Key must be valid Javascript Object path. Example: prompt.delimiter',
            },
            value: {
                description: chalk.white('Value:'),
                message: 'Value is required',
                default: false,
            },
            type: {
                required: true,
                message: ` Select the element type`,
                default: 'string',
                description: `${chalk.white('Type:')} ${typeList}\n    ${chalk.white('Select:')}`,
                before: (val) => {
                    val = Number(String(val).substr(0, 1)) - 1;
                    return types[val];
                }
            },
        }
    }
};


/**
 * COMMAND Function
 * @description Function that executes program.command()
 */
const COMMAND = ({ program, props }) => program.command(NAME)
    .description(DESC)
    .action(opt => { ACTION({ opt, props }); })
    .option('--key [key]', 'Config Object path. Example: toolkit.types')
    .option('--value [value]', 'The value of the config object')
    .option('--type [type]', `The data type: ${types.join(' | ')}`)
    .on('--help', HELP);


/**
 * ACTION Function
 * @description Function used as the commander.action() callback.
 * @see https://www.npmjs.com/package/commander
 * @param opt Object The commander options passed into the function.
 * @param props Object The CLI props passed from the calling class `orcli.js`.
 * @since 2.0.0
 */
const ACTION = ({ opt, props }) => {
    const { config, prompt, root } = props;

    const ovr = {};
    const schema = SCHEMA({ props });
    Object.keys(schema.properties).forEach((key) => {
        if (opt[key]) { ovr[key] = opt[key]; }
    });

    prompt.override = ovr;
    prompt.start();
    prompt.get(schema, (err, input) => {
        // Keep this conditional as the first line in this function.
        // Why? because you will get a js error if you try to set or use anything related to the input object.
        if (err) {
            prompt.stop();
            error(`${NAME} ${err.message}`);
            return;
        }

        const params = CONFORM(input);
        const { key, value } = params;

        message(`The following config will be written:`);

        const newConfig = { ...config };
        op.set(newConfig, key, value);
        console.log(prettier.format(
            JSON.stringify(newConfig),
            {parser: 'json-stringify'}
        ));

        CONFIRM({ props, params }).then(confirmed => {
            if (confirmed) {
                console.log('');

                params['confirmed'] = confirmed;
                params['newConfig'] = newConfig;

                generator({ params, props }).then(() => {
                    console.log('');
                });
            } else {
                prompt.stop();
                message(CANCELED);
            }
        })
        .then(() => prompt.stop())
        .catch(() => {
            prompt.stop();
            message(CANCELED);
        });
    });
};


/**
 * Module Constructor
 * @description Internal constructor of the module that is being exported.
 * @param program Class Commander.program reference.
 * @param props Object The CLI props passed from the calling class `arcli.js`.
 * @since 2.0.0
 */
module.exports = {
    ACTION,
    CONFIRM,
    CONFORM,
    COMMAND,
    NAME,
};
