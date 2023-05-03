/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
import actions from './actions.js';

const { Spinner, message, chalk, op, generator } = arcli;

/**
 * NAME String
 * @description Constant defined as the command name. Value passed to the commander.command() function.
 * @example $ arcli publish
 * @see https://www.npmjs.com/package/commander#command-specific-options
 * @since 2.0.0
 */
export const NAME = 'auth';

/**
 * DESC String
 * @description Constant defined as the command description. Value passed to
 * the commander.desc() function. This string is also used in the --help flag output.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const DESC = 'Actinium authenticator';

/**
 * CANCELED String
 * @description Message sent when the command is canceled
 * @since 2.0.0
 */
const CANCELED = 'Auth canceled!';

/**
 * conform(input:Object) Function
 * @description Reduces the input object.
 * @param input Object The key value pairs to reduce.
 * @since 2.0.0
 */
const CONFORM = ({ input }) =>
    Object.keys(input).reduce((obj, key) => {
        let val = input[key];
        switch (key) {
            default:
                obj[key] = val;
                break;
        }
        return obj;
    }, {});

/**
 * HELP Function
 * @description Function called in the commander.on('--help', callback) callback.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const HELP = () =>
    console.log(`
Example:
  $ arcli auth -u Bob -p MyP455VV0RD!
`);

/**
 * FLAGS
 * @description Array of flags passed from the commander options.
 * @since 2.0.18
 */
const FLAGS = ['app', 'clear', 'username', 'password', 'server'];

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
 * SCHEMA Function
 * @description used to describe the input for the prompt function.
 * @see https://www.npmjs.com/package/prompt
 * @since 2.0.0
 */
const SCHEMA = () => ({
    properties: {
        username: {
            description: chalk.white('Username:'),
            required: true,
        },
        password: {
            description: chalk.white('Password:'),
            hidden: true,
            message: 'Password is a required parameter',
            replace: '*',
            required: true,
        },
    },
});

/**
 * ACTION Function
 * @description Function used as the commander.action() callback.
 * @see https://www.npmjs.com/package/commander
 * @param opt Object The commander options passed into the function.
 * @param props Object The CLI props passed from the calling class `orcli.js`.
 * @since 2.0.0
 */
const ACTION = ({ opt, props }) => {
    const { prompt } = props;

    const ovr = FLAGS_TO_PARAMS({ opt });

    prompt.override = ovr;
    prompt.start();

    let params = { ...ovr };

    const schema = SCHEMA({ params, props });

    return new Promise((resolve, reject) => {
        prompt.get(schema, (err, input = {}) => {
            if (err) {
                prompt.stop();
                reject(`${NAME} ${err.message}`);
                return;
            }

            input = { ...ovr, ...input };
            params = CONFORM({ input, props });

            resolve();
        });
    }).then(() => {
        return generator({
            actions: actions(Spinner),
            params,
            props,
        }).catch(err => message(op.get(err, 'message', CANCELED)));
    });
};

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .option('-a, --app [app]', 'App ID')
        .option('-c, --clear [clear]', 'Clear sessionToken')
        .option('-u, --username [username]', 'Username')
        .option('-p, --password [password]', 'Password')
        .option('-s, --server [server]', 'Server URL')
        .on('--help', HELP);
