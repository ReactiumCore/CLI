/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const semver = require('semver');
const op = require('object-path');
const mod = path.dirname(require.main.filename);
const { error, message } = require(`${mod}/lib/messenger`);

const getPackageVersion = (cwd, inc) => {
    let val = '0.0.1';
    const pkgFile = path.normalize(path.join(cwd, 'package.json'));

    if (fs.existsSync(pkgFile)) {
        const { version } = require(`${cwd}/package`);
        val = version ? semver.coerce(version).version : val;
    }

    val = inc ? semver.inc(val, inc) : val;
    return val;
};

const GENERATOR = require('./generator');

/**
 * NAME String
 * @description Constant defined as the command name. Value passed to the commander.command() function.
 * @example $ arcli publish
 * @see https://www.npmjs.com/package/commander#command-specific-options
 * @since 2.0.0
 */
const NAME = 'publish';

/**
 * DESC String
 * @description Constant defined as the command description. Value passed to
 * the commander.desc() function. This string is also used in the --help flag output.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const DESC = 'Publish a reactium module';

/**
 * CANCELED String
 * @description Message sent when the command is canceled
 * @since 2.0.0
 */
const CANCELED = 'Publish canceled!';

/**
 * conform(input:Object) Function
 * @description Reduces the input object.
 * @param input Object The key value pairs to reduce.
 * @since 2.0.0
 */
const CONFORM = ({ input, props }) =>
    Object.keys(input).reduce((obj, key) => {
        let val = input[key];
        switch (key) {
            case 'version':
                const incs = ['major', 'minor', 'patch'];
                obj[key] = incs.includes(String(val).toLowerCase())
                    ? semver.inc(getPackageVersion(props.cwd), val)
                    : semver.coerce(val).version;
                break;

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
When specifying -v, --version with ${chalk.cyan('major')}, ${chalk.cyan(
        'minor',
    )}, or ${chalk.cyan('patch')}, the plugin ${chalk.bold(
        'package.json',
    )} ${chalk.cyan('version')} value will be incremented accordingly.

Example:
  $ arcli publish
`);

/**
 * FLAGS
 * @description Array of flags passed from the commander options.
 * @since 2.0.18
 */
const FLAGS = ['app', 'private', 'server', 'version'];

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
const SCHEMA = ({ props }) => {
    const sessionToken = op.get(props, 'config.registry.sessionToken');

    return {
        properties: {
            username: {
                ask: () => !sessionToken,
                description: chalk.white('Username:'),
                required: true,
            },
            password: {
                ask: () => !sessionToken,
                description: chalk.white('Password:'),
                hidden: true,
                message: 'Password is a required parameter',
                replace: '*',
                required: true,
            },
            version: {
                default: getPackageVersion(props.cwd, 'patch'),
                description: chalk.white('Version:'),
                message: 'Version is a required parameter',
                required: true,
            },
            private: {
                before: val => String(val).substr(0, 1).toUpperCase() === 'Y',
                default: 'N',
                description: `${chalk.white('Private')} ${chalk.cyan('(Y/N):')}`,
                message: ' ',
                pattern: /^y|n|Y|N/,
                required: true,
                type: 'string',
            }
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
        .then(() => GENERATOR({ params, props }))
        .then(() => prompt.stop())
        .then(results => console.log(''))
        .catch(err => {
            console.log(10, JSON.stringify(err));
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
        .action(opt => ACTION({ opt, props }))
        .option('-a, --app [app]', 'App ID')
        .option(
            '-p, --private [private]',
            'Make the plugin available to ACL targets only',
        )
        .option('-s, --server [server]', 'Server URL')
        .option('-v, --version [version]', 'Plugin semver. Defaults to 0.0.1')
        .on('--help', HELP);

/**
 * Module Constructor
 * @description Internal constructor of the module that is being exported.
 * @param program Class Commander.program reference.
 * @param props Object The CLI props passed from the calling class `arcli.js`.
 * @since 2.0.0
 */
module.exports = {
    COMMAND,
    NAME,
};
