/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

const path = require('path');
const chalk = require('chalk');
const op = require('object-path');
const inquirer = require('inquirer');
const generator = require('./generator');
const mod = path.dirname(require.main.filename);
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
const CANCELED = ' Reactium update canceled!';

/**
 * conform(input:Object) Function
 * @description Reduces the input object.
 * @param input Object The key value pairs to reduce.
 * @since 2.0.0
 */
const CONFORM = input => {
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
const CONFIRM = config =>
    inquirer.prompt([
        {
            type: 'confirm',
            prefix: chalk[config.prompt.prefixColor](config.prompt.prefix),
            suffix: chalk.magenta(': '),
            name: 'confirm',
            default: false,
            message: chalk.cyan('Are you sure you want to update?'),
        },
    ]);

/**
 * HELP Function
 * @description Function called in the commander.on('--help', callback) callback.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const HELP = () => {
    console.log('');
    console.log('Beware:');
    console.log(
        '  Update will overwrite existing ~/.core files and possibly alter the ~/package.json',
    );
    console.log('');
};

/**
 * FLAGS
 * @description Array of flags passed from the commander options.
 * @since 2.0.18
 */
const FLAGS = ['core'];

/**
 * FLAGS_TO_PARAMS Function
 * @description Create an object used by the prompt.override property.
 * @since 2.0.18
 */
const FLAGS_TO_PARAMS = ({ opt = {} }) =>
    FLAGS.reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) {
            obj[key] = val;
        }

        return obj;
    }, {});

/**
 * ACTION Function
 * @description Function used as the commander.action() callback.
 * @see https://www.npmjs.com/package/commander
 * @param opt Object The commander options passed into the function.
 * @param props Object The CLI props passed from the calling class `orcli.js`.
 * @since 2.0.0
 */
const ACTION = async ({ action, opt, props }) => {
    if (action !== 'update') return;

    console.log('');

    const { config, cwd, prompt } = props;

    const { confirm } = await CONFIRM(config);

    if (confirm !== true) {
        message(CANCELED);
        return;
    }

    const params = FLAGS_TO_PARAMS({ opt });

    return generator({ params, props })
        .then(() =>
            message(
                `Run: ${chalk.cyan(
                    '$ npm run local',
                )} to launch the development environment`,
            ),
        )
        .catch(err => message(op.get(err, 'message', CANCELED)));
};

/**
 * COMMAND Function
 * @description Function that executes program.command()
 */
const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((action, opt) => ACTION({ action, opt, props }))
        .option(
            '-c, --core [core]',
            'Update Reactium core only.',
        )
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
