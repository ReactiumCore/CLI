import actions from './actions.js';
const { Spinner, chalk, generator, message, op, prefix, flagsToParams } = arcli;

export const NAME = 'init';
const CANCELED = 'init canceled!';
const DESC = 'Initialize a new Reactium project';

const TYPES = {
    app: 'Reactium',
    api: 'Actinium',
};

// prettier-ignore
const HELP = () => console.log(`
Example:
  $ arcli init -h
`);

const CONFORM = (input, props) =>
    Object.keys(input).reduce((output, key) => {
        let val = input[key];

        output[key] = val;

        return output;
    }, {});

const PREFLIGHT = ({ msg, params }) => {
    message(msg || 'Preflight checklist:');
    console.log(`Preparing to initialize ${TYPES[params.type]}...`);
    console.log('');
};

const INPUT = ({ inquirer }, params) => {
    const validate = val => ['app', 'api'].includes(val);

    return inquirer.prompt([
        {
            type: 'list',
            default: 'app',
            choices: [
                { name: 'Reactium (Web Application)', value: 'app' },
                { name: 'Actinium (Web API)', value: 'api' },
            ],
            name: 'type',
            prefix,
            message: 'Initialize what type of project?',
            suffix: chalk.magenta(': '),
            validate,
            when: !validate(params.type),
        },
    ]);
};
const CONFIRM = ({ inquirer }, { type }) => {
    return inquirer.prompt([
        {
            default: false,
            type: 'confirm',
            name: 'confirm',
            message: `Initialize ${TYPES[type]} here?`,
            prefix,
            suffix: chalk.magenta(': '),
        },
    ]);
};

const ACTION = async ({ opt, props }) => {
    const flags = ['type'];

    let params = flagsToParams({ opt, flags });

    const userInput = await INPUT(props, params);
    Object.entries(userInput).forEach(([key, val]) => (params[key] = val));

    params = CONFORM(params, props);

    PREFLIGHT({ params });

    const { confirm } = await CONFIRM(props, params);
    if (confirm !== true) {
        message(CANCELED);
        return;
    }

    return generator({
        actions: actions(Spinner),
        params,
        props,
    }).catch(err => message(op.get(err, 'message', CANCELED)));
};

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .option(
            '-t, --type [flavor]',
            'Type of project to initialize (app or api)',
        )
        .on('--help', HELP);

export const ID = NAME;
