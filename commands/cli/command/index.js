import generator from './generator.js';

const { chalk, op, slugify, message } = arcli;

const NAME = 'commander';
const CANCELED = 'Command creation canceled!';
const DESC = 'ARCLI:    Create a CLI function.';

const HELP = () =>
    console.log(`
Shortcuts:
  When creating a command, there are 3 --destination shortcuts available:
  ${chalk.cyan('cwd/')} | ${chalk.cyan('app/')} | ${chalk.cyan(
        'core/',
    )} | ${chalk.cyan('root/')}

    ${chalk.cyan('cwd/')}
      Creates a command in the ${chalk.cyan(
          '~/project-root/.cli/commands',
      )} directory:
        $ arcli commander --command 'fubar' --destination '${chalk.cyan(
            'cwd/',
        )}fubar'

        ${chalk.cyan(
            '* Note:',
        )} commands created in the project-root are specific to the current project.

    ${chalk.cyan('app/')}
      Creates a command in the ${chalk.cyan(
          '~/project-root/src/app/.cli/commands',
      )} directory:
        $ arcli commander --command 'fubar' --destination '${chalk.cyan(
            'app/',
        )}fubar'

        ${chalk.cyan(
            '* Note:',
        )} commands created in the app directory are specific to the current project and version of the framework Reactium or Actinium.
          Should you update the framework core, your commands will be overwritten.
          It is recommended to only place commands in the app directory if you are contributing to Reactium or Actinium core.

    ${chalk.cyan('core/')}
      Creates a command in the ${chalk.cyan(
          '~/project-root/.core/.cli/commands',
      )} directory:
        $ arcli commander --command 'fubar' --destination '${chalk.cyan(
            'core/',
        )}fubar'

        ${chalk.cyan(
            '* Note:',
        )} this option should only be used when creating Actinium and Reactium source functions.


    ${chalk.cyan('root/')}
      Creates a command in the ${chalk.cyan(
          '~/home/.arcli/commands',
      )} directory:
        $ arcli commander --command 'fubar' --destination '${chalk.cyan(
            'root/',
        )}fubar'

        ${chalk.cyan(
            '* Note:',
        )} commands created in the root directory or subject to being overwritten if you update ARCLI.
          It is recommended to only place commands in the root directory if you are contributing to ARCLI.
`);

const formatDestination = (val, props) => {
    const { cwd, root } = props;

    const replacers = [
        [/^~\/|^\/cwd\/|^cwd\//i, `${cwd}/.cli/commands/`],
        [/^\/app\/|^app\//i, `${cwd}/src/app/.cli/commands/`],
        [/^\/core\/|^core\//i, `${cwd}/.core/.cli/commands/`],
        [/^\/root\/|^root\//i, `${root}/commands/`],
    ];

    return arcli.normalizePath(
        replacers.reduce(
            (newVal, replacer) => newVal.replace(replacer[0], replacer[1]),
            val,
        ),
    );
};

const CONFORM = ({ input, props }) =>
    Object.keys(input).reduce((output, key) => {
        let val = input[key];

        switch (key) {
            case 'destination':
                val = formatDestination(val, props);
                break;
        }

        output[key] = val;

        return output;
    }, {});

const CONFIRM = ({ inquirer }) =>
    inquirer.prompt([
        {
            default: false,
            type: 'confirm',
            name: 'confirm',
            prefix: arcli.prefix,
            message: chalk.cyan('Proceed?'),
            suffix: chalk.magenta(': '),
        },
    ]);

const OVERWRITE = ({ inquirer }) =>
    inquirer.prompt([
        {
            default: false,
            type: 'confirm',
            name: 'overwrite',
            prefix: arcli.prefix,
            suffix: chalk.magenta(': '),
            message: chalk.cyan(
                'The current directory is not empty.\n           Overwrite?',
            ),
        },
    ]);

const DESTINATION = ({ cwd, inquirer, root }, name) =>
    inquirer.prompt([
        {
            default: 0,
            type: 'list',
            name: 'destination',
            message: 'Destination',
            prefix: arcli.prefix,
            suffix: chalk.magenta(': '),
            choices: [
                {
                    name: 'App',
                    value: arcli.normalizePath(
                        cwd,
                        'src',
                        'app',
                        '.cli',
                        'commands',
                        name,
                    ),
                },
                {
                    name: 'Core',
                    value: arcli.normalizePath(
                        cwd,
                        '.core',
                        '.cli',
                        'commands',
                        name,
                    ),
                },
                {
                    name: 'Project',
                    value: arcli.normalizePath(cwd, '.cli', 'commands', name),
                },
                {
                    name: 'Root',
                    value: arcli.normalizePath(root, 'commands', name),
                },
                {
                    name: 'Custom',
                    value: 'custom',
                },
            ],
        },
    ]);

const COMMANDNAME = ({ inquirer }) =>
    inquirer.prompt([
        {
            type: 'input',
            name: 'command',
            prefix: arcli.prefix,
            suffix: chalk.magenta(': '),
            message: chalk.cyan('Command'),
        },
    ]);

const CUSTOMDEST = ({ inquirer }) =>
    inquirer.prompt([
        {
            type: 'input',
            name: 'custom',
            prefix: arcli.prefix,
            suffix: chalk.magenta(': '),
            message: chalk.cyan('Destination'),
        },
    ]);

// prettier-ignore
const PREFLIGHT = params => console.log(`
 The ${chalk.bold.cyan(params.command)} command will be created at:
   ${chalk.magenta(params.destination)}
`);

const flags = ['command', 'destination', 'overwrite'];

const ACTION = async ({ opt, props }) => {
    console.log('');

    let params = arcli.flagsToParams({ opt, flags });

    if (!params.command) {
        const { command } = await COMMANDNAME(props);
        params.command = command;
    }

    if (!params.destination) {
        const { destination } = await DESTINATION(
            props,
            String(slugify(params.command)).toLowerCase(),
        );
        params.destination = destination;
    }

    if (params.destination === 'custom') {
        const { custom } = await CUSTOMDEST(props);
        params.destination = custom;
    }

    params.destination = formatDestination(params.destination, props);

    if (!arcli.isEmpty(params.destination) && !params.overwrite) {
        const { overwrite } = await OVERWRITE(props);
        if (overwrite !== true) {
            message(CANCELED);
            return;
        }
        params.overwrite = overwrite;
    }

    params = CONFORM({ input: params, props });

    PREFLIGHT(params);

    const { confirm } = await CONFIRM(props);
    if (confirm !== true) {
        message(CANCELED);
        return;
    }

    return generator({ params, props }).catch(err =>
        message(op.get(err, 'message', CANCELED)),
    );
};

export const COMMAND = ({ program, props }) =>
    program
        .command(NAME)
        .description(DESC)
        .action(opt => ACTION({ opt, props }))
        .option(
            '-d, --destination [destination]',
            'Path where the command is saved',
        )
        .option('-c, --command [command]', 'Command prompt.')
        .option(
            '-o, --overwrite [overwrite]',
            'Overwrite the existing command.',
            false,
        )
        .on('--help', HELP);

export const ID = NAME;
