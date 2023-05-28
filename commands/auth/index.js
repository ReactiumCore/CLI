/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
import actions from './actions.js';

const { Spinner, chalk, generator, message, op, prefix } = arcli;

const suffix = chalk.magenta(':');

export const NAME = 'auth';

const DESC = 'Actinium authenticator';

const CANCELED = 'Auth canceled!';

const CONFORM = input =>
    Object.keys(input).reduce((obj, key) => {
        let val = input[key];
        switch (key) {
            default:
                obj[key] = val;
                break;
        }
        return obj;
    }, {});

const HELP = () =>
    console.log(`
Example:
  $ reactium auth -u Bob -p MyP455VV0RD!
  $ reactium auth -c
  $ reactium auth --unattended
`);

const FLAGS = ['app', 'clear', 'username', 'password', 'server', 'unattended'];

const FLAGS_TO_PARAMS = ({ opt = {} }) =>
    FLAGS.reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) {
            obj[key] = val;
        }

        return obj;
    }, {});

const INPUT = ({ inquirer }, params) => {
    if (op.get(params, 'unattended') === true) return params;

    const clear = op.get(params, 'clear');

    return inquirer.prompt(
        [
            {
                prefix,
                suffix,
                type: 'input',
                name: 'username',
                message: 'Username',
                when: !clear && !op.get(params, 'username'),
            },
            {
                prefix,
                suffix,
                type: 'password',
                name: 'password',
                message: 'Password',
                when: !clear && !op.get(params, 'password'),
            },
        ],
        params,
    );
};

const ACTION = async ({ opt, props }) => {
    const ovr = FLAGS_TO_PARAMS({ opt });
    let params = { ...ovr };

    const userInput = await INPUT(props, params);
    Object.entries(userInput).forEach(([key, val]) => (params[key] = val));

    params = CONFORM(params);

    await generator({
        actions: actions(Spinner),
        params,
        props,
    }).catch(err => {
        message(op.get(err, 'message', CANCELED));
    });

    console.log('');
};

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .option('-u, --username [username]', 'Username')
        .option('-p, --password [password]', 'Password')
        .option('-a, --app [app]', 'Actinium app ID')
        .option('-s, --server [server]', 'Actinium server URL')
        .option(
            '--unattended [unattended]',
            'Used to validate an existing Actinium session',
        )
        .option(
            '-c, --clear [clear]',
            'Used to clear an existing Actinium session',
        )
        .on('--help', HELP);
