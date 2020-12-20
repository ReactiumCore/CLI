/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

const fs                 = require('fs-extra');
const path               = require('path');
const chalk              = require('chalk');
const generator          = require('./generator');
const pkgCont            = require('./package');
const op                 = require('object-path');
const mod                = path.dirname(require.main.filename);
const { error, message } = require(`${mod}/lib/messenger`);


/**
 * NAME String
 * @description Constant defined as the command name. Value passed to the commander.command() function.
 * @example $ arcli re:install --overwrite
 * @see https://www.npmjs.com/package/commander#command-specific-options
 * @since 2.0.0
 */
const NAME = 'reactium <update>';


/**
 * DESC String
 * @description Constant defined as the command description. Value passed to
 * the commander.desc() function. This string is also used in the --help flag output.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const DESC = 'Reactium: Update core.';


/**
 * CANCELED String
 * @description Message sent when the command is canceled
 * @since 2.0.0
 */
const CANCELED = 'Reactium update canceled!';


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
            default:
                output[key] = val;
                break;
        }
    });

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
                    description: `${chalk.white('Proceed?')} ${chalk.cyan('(Y/N):')}`,
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
                params['confirmed'] = true;
                resolve(params);
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
    console.log('Beware:');
    console.log('  Update will overwrite existing ~/.core files and possibly alter the ~/package.json');
    console.log('');
};


/**
 * SCHEMA Object
 * @description used to describe the input for the prompt function.
 * @see https://www.npmjs.com/package/prompt
 * @since 2.0.0
 */
const SCHEMA = {
    properties: {
        confirm: {
            description: `${chalk.white('Are you sure you want to update?')} ${chalk.cyan('(Y/N):')}`,
            before: (val) => {
                return (String(val).toLowerCase() === 'y');
            }
        }
    }
};


/**
 * ACTION Function
 * @description Function used as the commander.action() callback.
 * @see https://www.npmjs.com/package/commander
 * @param opt Object The commander options passed into the function.
 * @param props Object The CLI props passed from the calling class `orcli.js`.
 * @since 2.0.0
 */
const ACTION = ({ action, opt, props }) => {
    if (action !== 'update') { return; }

    const { cwd, prompt } = props;

    const ovr = {};
    Object.keys(SCHEMA.properties).forEach((key) => {
        if (opt[key]) { ovr[key] = opt[key]; }
    });

    prompt.override = ovr;
    prompt.start();
    prompt.get(SCHEMA, (err, input) => {
        // Keep this conditional as the first line in this function.
        // Why? because you will get a js error if you try to set or use anything related to the input object.
        if (err) {
            prompt.stop();
            error(`${NAME} ${err.message}`);
            return;
        }

        const params = CONFORM(input);

        if (op.get(opt, 'core') === true) {
            params['core'] = true;
        }

        const { confirm } = params;

        // Exit if confirm !== true
        if (!confirm) {
            prompt.stop();
            message(CANCELED);
            return;
        }

        console.log('');

        generator({ params, props }).then(success => {
            prompt.stop();
            message(`Run: ${chalk.cyan('$ npm install')} before launching the development environment.`);
        });
    });
};


/**
 * COMMAND Function
 * @description Function that executes program.command()
 */
const COMMAND = ({ program, props }) => program.command(NAME)
    .description(DESC)
    .action((action, opt) => ACTION({ action, opt, props }))
    .option('-o, --overwrite [overwrite]', 'Overwrite the current directory.')
    .option('-e, --empty [empty]', 'Update without demo site and components.')
    .option('-c, --core [core]', 'Update the Reactium core only.')
    .option('-y, --confirm', 'Skip confirmation.')
    .on('--help', HELP);


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
    ID: NAME,
};
