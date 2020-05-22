/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

const chalk = require('chalk');
const prettier = require('prettier');
const path = require('path');
const op = require('object-path');
const mod = path.dirname(require.main.filename);
const { error, message } = require(`${mod}/lib/messenger`);
const GENERATOR = require('./generator');
const fs = require('fs-extra');
const props = arcli.props;
const prefix = arcli.prefix;
const { inquirer } = props;

/**
 * NAME String
 * @description Constant defined as the command name. Value passed to the commander.command() function.
 * @example $ arcli project status
 * @see https://www.npmjs.com/package/commander#command-specific-options
 * @since 2.0.0
 */
const NAME = 'project <stop>';

/**
 * DESC String
 * @description Constant defined as the command description. Value passed to
 * the commander.desc() function. This string is also used in the --help flag output.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const DESC = 'Stop the running project';

/**
 * CANCELED String
 * @description Message sent when the command is canceled
 * @since 2.0.0
 */
const CANCELED = 'Action canceled!';

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
  $ arcli project stop -h
`);

/**
 * FLAGS
 * @description Array of flags passed from the commander options.
 * @since 2.0.18
 */
const FLAGS = [];

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

const PROJECT_PROMPT = () => {
    const projects = op.get(props, 'config.projects', {});

    return inquirer.prompt([
        {
            prefix,
            name: 'projectObj',
            type: 'list',
            message: 'Select project:',
            choices: Object.keys(projects),
            default: 0,
            filter: val => {
                const projectPath = op.get(projects, [val, 'path']);
                const projectJSON = arcli.normalizePath(
                    projectPath,
                    'project.json',
                );

                if (fs.existsSync(projectJSON)) {
                    return fs.readJSONSync(projectJSON);
                }
                return false;
            },
        },
    ]);
};

/**
 * ACTION Function
 * @description Function used as the commander.action() callback.
 * @see https://www.npmjs.com/package/commander
 * @param opt Object The commander options passed into the function.
 * @param props Object The CLI props passed from the calling class `orcli.js`.
 * @since 2.0.0
 */
const ACTION = async ({ arcli, opt, props }) => {
    const { cwd, prompt } = props;

    let params = {};

    // TODO: get project config from command
    params.project = fs.readJSONSync(
        arcli.normalizePath(props.cwd, 'project.json'),
        { throws: false },
    );

    if (!params.project) {
        let project;
        if (Object.values(op.get(props, 'config.projects', {})).length > 0) {
            const { projectObj } = await PROJECT_PROMPT();
            project = projectObj;
        }

        if (!project) {
            console.log();
            message(`No project found.`);
            process.exit();
        }

        params.project = project;
    }

    return GENERATOR({ arcli, params, props })
        .then(results => {
            process.exit();
        })
        .catch(err => {
            message(op.get(err, 'message', CANCELED));
        });
};

/**
 * COMMAND Function
 * @description Function that executes program.command()
 */
const COMMAND = ({ arcli, program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ arcli, opt, props }))
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
    ID: NAME,
};
