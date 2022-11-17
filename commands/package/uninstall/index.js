/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
import GENERATOR from './generator.js';

const { message, op } = arcli;

/**
 * NAME String
 * @description Constant defined as the command name. Value passed to the commander.command() function.
 * @example $ arcli install
 * @see https://www.npmjs.com/package/commander#command-specific-options
 * @since 2.0.0
 */
export const NAME = 'uninstall <name>';

/**
 * DESC String
 * @description Constant defined as the command description. Value passed to
 * the commander.desc() function. This string is also used in the --help flag output.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const DESC = 'Uninstall an Actinium or Reactium Plugin.';

/**
 * CANCELED String
 * @description Message sent when the command is canceled
 * @since 2.0.0
 */
const CANCELED = 'Action canceled!';

/**
 * HELP Function
 * @description Function called in the commander.on('--help', callback) callback.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const HELP = () =>
    console.log(`
Example:
  $ arcli uninstall @atomic-reactor/admin
`);

/**
 * ACTION Function
 * @description Function used as the commander.action() callback.
 * @see https://www.npmjs.com/package/commander
 * @param opt Object The commander options passed into the function.
 * @param props Object The CLI props passed from the calling class `orcli.js`.
 * @since 2.0.0
 */
const ACTION = ({ name, props }) =>
    GENERATOR({ params: { name }, props })
        .then(() => process.exit())
        .catch(err =>
            message(op.get(err, 'message', op.get(err, 'msg', CANCELED))),
        );

/**
 * COMMAND Function
 * @description Function that executes program.command()
 */
export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((name, opt) => ACTION({ name, opt, props }))
        .on('--help', HELP);
