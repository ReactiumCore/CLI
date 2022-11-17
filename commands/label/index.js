/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

const { chalk, fs, message, op, prettier } = arcli;

/**
 * NAME String
 * @description Constant defined as the command name. Value passed to the commander.command() function.
 * @example $ arcli label
 * @see https://www.npmjs.com/package/commander#command-specific-options
 * @since 2.0.0
 */
export const NAME = 'label';

/**
 * DESC String
 * @description Constant defined as the command description. Value passed to
 * the commander.desc() function. This string is also used in the --help flag output.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const DESC = 'Label a directory for use in other commands.';

/**
 * CANCELED String
 * @description Message sent when the command is canceled
 * @since 2.0.0
 */
const CANCELED = 'Action canceled!';

/**
 * confirm({ props:Object, params:Object }) Function
 * @description Prompts the user to confirm the operation
 * @since 2.0.0
 */
const CONFIRM = ({ props, params, msg }) => {
    const { prompt } = props;

    msg = msg || chalk.white('Proceed?');

    return new Promise((resolve, reject) => {
        prompt.get(
            {
                properties: {
                    confirmed: {
                        description: `${msg} ${chalk.cyan('(Y/N):')}`,
                        type: 'string',
                        required: true,
                        pattern: /^y|n|Y|N/,
                        message: ` `,
                        before: val => {
                            return String(val).toUpperCase() === 'Y';
                        },
                    },
                },
            },
            (error, input = {}) => {
                const confirmed = op.get(input, 'confirmed', false);
                if (error || confirmed === false) {
                    reject(error);
                } else {
                    params['confirmed'] = true;
                    resolve(params);
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
const CONFORM = ({ input, props }) =>
    Object.keys(input).reduce(
        (obj, key) => {
            let val = input[key];
            switch (key) {
                default:
                    obj[key] = val;
                    break;
            }
            return obj;
        },
        {
            type: 'string',
        },
    );

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
    console.log(
        `   $ arcli ${NAME} --path '[cwd]/some/relative/path' --key 'labels.path-label'`,
    );
    console.log('');
};

/**
 * FLAGS
 * @description Array of flags passed from the commander options.
 * @since 2.0.18
 */
const FLAGS = ['path', 'key'];

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

const resolveAliasesFactory = props => value => {
    const { root, cwd } = props;

    value = String(value)
        .replace(/\[root\]/gi, root)
        .replace(/\[cwd\]/gi, cwd);

    return value;
};

/**
 * SCHEMA Function
 * @description used to describe the input for the prompt function.
 * @see https://www.npmjs.com/package/prompt
 * @since 2.0.0
 */
const SCHEMA = ({ props }) => {
    const resolveAliases = resolveAliasesFactory(props);

    return {
        properties: {
            path: {
                description: 'Path:',
                required: true,
                default: props.cwd,
                before: resolveAliases,
                conform: value => {
                    const check = resolveAliases(value);
                    return fs.existsSync(check);
                },
                message: 'Path must be a valid existing path.',
            },

            key: {
                description: chalk.white('Key:'),
                required: true,
                pattern: /^[a-zA-Z\_\-\.]+$/,
                type: 'string',
                default: `labels.${path.basename(props.cwd)}`,
                message:
                    'Key must be valid Javascript Object path. Example: prompt.delimiter',
            },
        },
    };
};

/**
 * ACTION Function
 * @description Function used as the commander.action() callback.
 * @see https://www.npmjs.com/package/commander
 * @param opt Object The commander options passed into the function.
 * @param props Object The CLI props passed from the calling class `orcli.js`.
 * @since 2.0.0
 */
const ACTION = async ({ opt, props }) => {
    const { prompt, config } = props;
    const schema = SCHEMA({ props });
    const ovr = FLAGS_TO_PARAMS({ opt });

    prompt.override = ovr;
    prompt.start();

    let params = {};

    const GENERATOR = await import(`${root}/commands/config/set/generator`);

    return new Promise((resolve, reject) => {
        prompt.get(schema, (err, input = {}) => {
            if (err) {
                prompt.stop();
                reject(`${NAME} ${err.message}`);
                return;
            }

            input = { ...ovr, ...input };
            params = CONFORM({ input, props });
            const { key, path: value } = params;

            const newConfig = { ...config };
            op.set(newConfig, key, value);
            op.set(params, 'newConfig', newConfig);
            console.log(
                prettier.format(JSON.stringify(newConfig), {
                    parser: 'json-stringify',
                }),
            );

            resolve();
        });
    })
        .then(() => CONFIRM({ props, params }))
        .then(() => GENERATOR({ params, props }))
        .then(() => prompt.stop())
        .then(() => console.log(''))
        .catch(err => {
            prompt.stop();
            message(op.get(err, 'message', CANCELED));
        });
};

/**
 * COMMAND Function
 * @description Function that executes program.command()
 */
export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .option('-p, --path [path]', 'Path to label.')
        .option('-k, --key [key]', 'Key to use for directory label.')
        .on('--help', HELP);
