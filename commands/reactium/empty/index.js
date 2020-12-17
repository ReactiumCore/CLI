/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

const chalk = require('chalk');
const fs = require('fs-extra');
const prettier = require('prettier');
const path = require('path');
const op = require('object-path');
const mod = path.dirname(require.main.filename);
const { error, message } = require(`${mod}/lib/messenger`);
const GENERATOR = fs.existsSync(
    path.normalize(path.join(__dirname, 'generator.js')),
)
    ? require('./generator')
    : require(`${mod}/lib/generator`);

/**
 * NAME String
 * @description Constant defined as the command name. Value passed to the commander.command() function.
 * @example $ arcli reactium empty
 * @see https://www.npmjs.com/package/commander#command-specific-options
 * @since 2.0.0
 */
const NAME = 'reactium <empty>';

/**
 * DESC String
 * @description Constant defined as the command description. Value passed to
 * the commander.desc() function. This string is also used in the --help flag output.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const DESC = 'Reactium: Remove demo pages, components, and toolkit.';

/**
 * CANCELED String
 * @description Message sent when the command is canceled
 * @since 2.0.0
 */
const CANCELED = 'Reactium empty canceled!';

/**
 * confirm({ props:Object, params:Object }) Function
 * @description Prompts the user to confirm the operation
 * @since 2.0.0
 */
const CONFIRM = ({ props, params }) => {
    const { prompt } = props;
    if (op.get(prompt, 'override.confirm', false) === true)
        return Promise.resolve(true);

    return new Promise((resolve, reject) => {
        prompt.get(
            {
                properties: {
                    confirmed: {
                        description: `${chalk.white(
                            'This is a destructive operation. Are you sure?',
                        )} ${chalk.cyan('(Y/N):')}`,
                        type: 'string',
                        required: true,
                        pattern: /^y|n|Y|N/,
                        message: ` `,
                        before: val => {
                            return String(val).toLowerCase() === 'y';
                        },
                    },
                },
            },
            (error, input) => {
                let confirmed;

                try {
                    confirmed = input.confirmed;
                } catch (err) {
                    confirmed = false;
                }

                if (error || confirmed === false) {
                    reject(error);
                } else {
                    resolve(confirmed);
                }
            },
        );
    });
};

/**
 * conform(input:Object) Function
 * @description Reduces the input object.
 * @param input Object The key value pairs to reduce.
 * @since 2.0.0
 */
const CONFORM = ({ input, props }) => {
    const { cwd } = props;

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
 * HELP Function
 * @description Function called in the commander.on('--help', callback) callback.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const HELP = () => {
    console.log('');
    console.log('Usage:');
    console.log('');
    console.log(' Keep the default toolkit:');
    console.log('  $ arcli reactium empty --no-toolkit');
    console.log('');
    console.log(' Keep the demo site:');
    console.log('  $ arcli reactium empty --no-demo');
    console.log('');
};

/**
 * SCHEMA Function
 * @description used to describe the input for the prompt function.
 * @see https://www.npmjs.com/package/prompt
 * @since 2.0.0
 */
const SCHEMA = ({ props }) => {
    const { cwd, prompt } = props;

    return {
        properties: {
            // sample: {
            //     description: chalk.white('Sample:'),
            //     required: true,
            //     default: true,
            // },
        },
    };
};

/**
 * FLAGS
 * @description Array of flags passed from the commander options.
 * @since 2.0.18
 */
const FLAGS = ['confirm', 'demo', 'font', 'images', 'style', 'toolkit'];

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
const ACTION = ({ opt, props }) => {
    const { cwd, prompt } = props;
    const schema = SCHEMA({ props });
    const ovr = FLAGS_TO_PARAMS({ opt });

    prompt.override = ovr;
    prompt.start();

    let params = {};

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
    })
        .then(() => CONFIRM({ props, params }))
        .then(() => GENERATOR({ params, props }))
        .then(() => prompt.stop())
        .then(results => {
            console.log('');
        })
        .catch(err => {
            prompt.stop();
            message(op.get(err, 'message', CANCELED));
        });
};

/**
 * COMMAND Function
 * @description Function that executes program.command()
 */
const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((commandName, opt) => ACTION({ opt, props }))
        .option('-D, --no-demo', 'Keep the demo site and components.')
        .option(
            '-T, --no-toolkit',
            'Keep the default toolkit elements.',
        )
        .option(
            '-S, --no-style',
            'Do not empty the ~/src/assets/style/style.scss file.',
        )
        .option(
            '-F, --no-font',
            'Do not empty the ~/src/assets/fonts directory.',
        )
        .option(
            '-I, --no-images',
            'Do not empty the ~/src/assets/images directory.',
        )
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
