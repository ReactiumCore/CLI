/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const _ = require('underscore');
const op = require('object-path');
const GENERATOR = require('./generator');
const mod = path.dirname(require.main.filename);
const { appTypes, projectTypes } = require('../enums');
const { error, message } = require(`${mod}/lib/messenger`);

const { arcli, Hook } = global;
const props = arcli.props;
const prefix = arcli.prefix;

const { inquirer } = props;

const isEmpty = cwd => fs.readdirSync(cwd).length < 1;

const normalize = (...args) => path.normalize(path.join(...args));

const NAME = 'project <init>';

const DESC = 'Create a new Atomic Reactor project';

const CANCELED = 'Project creation canceled!';

const HELP = () => {
    console.log('');
    console.log(`Project Types:`);
    console.log(
        ' ',
        _.pluck(projectTypes, 'key')
            .sort()
            .map(key => chalk.cyan(key))
            .join(' | '),
    );
    console.log('');
    console.log('App Types:');
    console.log(
        ' ',
        _.pluck(appTypes, 'key')
            .sort()
            .map(key => chalk.cyan(key))
            .join(' | '),
    );
    console.log('');
};

const FLAGS = () => {
    let flags = [
        'admin',
        'api',
        'app',
        'overwrite',
        'import',
        'type',
        'unattended',
    ];
    Hook.runSync('project-init-flags', flags);
    return flags;
};

const FLAGS_TO_PARAMS = opt =>
    FLAGS().reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) obj[key] = val;

        return obj;
    }, {});

const PREFLIGHT = async params => {
    const { inquirer } = props;

    // Transform the preflight object instead of the params object
    const preflight = { ...params };

    // Output messge
    const msg =
        'A new project will be created using the following configuration:';
    message(msg);
    console.log(JSON.stringify(preflight, null, 2));
    console.log('');

    if (!op.has(params, 'overwrite') && !isEmpty(props.cwd)) {
        const { confirm } = await inquirer.prompt([
            {
                prefix,
                name: 'confirm',
                type: 'confirm',
                message: 'Proceed?:',
                default: true,
            },
        ]);

        if (confirm !== true) {
            message(CANCELED);
            process.exit();
        }
    }
};

const CONFORM = async params => {
    Hook.runSync('project-init-conform', { arcli, params, props });

    return Object.keys(params).reduce((obj, key) => {
        let val = params[key];
        switch (key) {
            default:
                obj[key] = val;
                break;
        }
        return obj;
    }, {});
};

const UNATTENDED = async params => {
    params = await CONFORM(params);

    await GENERATOR(params);

    if (!op.get(params, 'import')) {
        fs.writeJsonSync(normalize(props.cwd, 'project.json'), params);
    }

    console.log('');
    return params;
};

const PROJECT_IMPORT = params => {
    const fromImport = op.get(params, 'import');

    if (!fromImport) return params;

    if (typeof fromImport === 'boolean') {
        let projectPath = normalize(props.cwd, 'project.json');

        if (fs.existsSync(projectPath)) {
            params = require(projectPath);
            op.set(params, 'unattended', true);
        }
    } else {
        params = require(params.import);
        op.set(params, 'unattended', true);
    }

    return params;
};

const PROJECT_IMPORT_PROMPT = () =>
    inquirer
        .prompt([
            {
                prefix,
                name: 'doImport',
                type: 'confirm',
                message: 'Import from project.json file?:',
                default: false,
            },
        ])
        .then(input => {
            const { doImport } = input;

            if (doImport !== true) {
                console.log('');
                return;
            }

            return inquirer.prompt([
                {
                    prefix,
                    name: 'importPath',
                    type: 'fuzzypath',
                    message: 'Import file path:',
                    itemType: 'file',
                    rootPath: path.resolve('/'),
                    excludePath: p =>
                        p.includes('node_modules') || p.startsWith('/Volumes/') || p.includes('.Trash'),
                    excludeFilter: p => !p.endsWith('/project.json'),
                    depthLimit: 4,
                },
            ]);
        })
        .then(input => op.get(input, 'importPath'));

const OVERWRITE_PROMPT = async params => {
    if (!op.has(params, 'overwrite') && !isEmpty(props.cwd)) {
        const { overwrite } = await inquirer.prompt([
            {
                prefix,
                name: 'overwrite',
                type: 'confirm',
                message: 'The current directory is not empty!\n\t  Ovewrite?:',
                default: false,
            },
        ]);

        if (overwrite !== true) {
            message(CANCELED);
            process.exit();
        }

        console.log('');
    }
};

const APP_PROMPT = () =>
    inquirer.prompt([
        {
            prefix,
            name: 'app',
            type: 'list',
            message: 'What type of app?:',
            choices: _.pluck(appTypes, 'value'),
            default: _.findIndex(appTypes, { key: 'web' }),
            filter: val => _.findWhere(appTypes, { value: val }).key,
        },
    ]);

const API_PROMPT = () =>
    inquirer.prompt([
        {
            prefix,
            name: 'api',
            type: 'confirm',
            message: 'Need an API?:',
            default: false,
        },
    ]);

const ADMIN_PROMPT = () =>
    inquirer.prompt([
        {
            prefix,
            name: 'admin',
            type: 'confirm',
            message: 'Need an Admin?:',
            default: false,
        },
    ]);

const ACTION = async (action, params) => {
    console.log('');

    props.command = action;

    params = PROJECT_IMPORT(params);

    if (!op.get(params, 'import')) {
        Hook.runSync('project-init-params', { arcli, params, props });
    }

    // Run unattended from params
    if (op.get(params, 'unattended') === true) {
        return UNATTENDED(params);
    }

    // 0.0 - Check current directory
    await OVERWRITE_PROMPT(params);

    // 0.1 - Ask to import
    const importPath = await PROJECT_IMPORT_PROMPT();
    if (importPath) {
        params.import = importPath;
        params = PROJECT_IMPORT(params);
        if (op.get(params, 'unattended') === true) return UNATTENDED(params);
    }

    /**
     * -------------------------------------------------------------------------
     * 1.0 - Gather input
     * -------------------------------------------------------------------------
     */
    // 1.1 - input hook
    Hook.runSync('project-init-input', { arcli, params, props });

    // 1.2 - params.project, params.type
    if (!op.has(params, 'type')) {
        const { project, type } = await inquirer.prompt([
            {
                prefix,
                name: 'project',
                type: 'input',
                message: 'Project name:',
                validate: val => (!val ? 'Project name is required' : true),
            },
            {
                prefix,
                name: 'type',
                type: 'list',
                message: 'What type of project would you like to create?:',
                choices: _.pluck(projectTypes, 'value'),
                default: _.findIndex(projectTypes, { key: 'full-stack' }),
                filter: val => _.findWhere(projectTypes, { value: val }).key,
            },
        ]);
        params.project = project;
        params.type = type;
    }

    if (params.type === 'full-stack') {
        const { app } = await APP_PROMPT();
        params.admin = true;
        params.api = true;
        params.app = app;
    }

    // 1.3 - params.app
    if (!op.has(params, 'app') && params.type === 'app') {
        const { app } = await APP_PROMPT();
        const { api } = await API_PROMPT();
        params.api = api;
        params.app = app;
    }

    // 1.4 - params.admin
    if (
        !op.has(params, 'admin') &&
        (op.get(params, 'api') === true || params.type === 'api')
    ) {
        const { admin } = await ADMIN_PROMPT();
        params.admin = admin;
    }

    // 2.0 - conform the params
    params = await CONFORM(params);

    // 3.0 - preflight
    await PREFLIGHT(params);

    // 5.0 - execute
    await GENERATOR(params);

    console.log('');

    // 6.0 - write the project.json file
    fs.writeJsonSync(normalize(props.cwd, 'project.json'), params);

    // 7.0 - return the params for usage in another command
    return params;
};

const COMMAND = ({ program, ...args }) =>
    program
        .command(NAME)
        .description(DESC)
        .action((action, opt) => ACTION(action, FLAGS_TO_PARAMS(opt)))
        .option('-t, --type [type]', 'The project type.')
        .option(
            '-a, --app [app]',
            `When project type is ${chalk.cyan(
                'app',
            )}, specify which app type.`,
        )
        .option('-i, --import [import]', 'Import a project.json file')
        .option('-o, --overwrite [overwrite]', 'Overwrite existing project.')
        .option('--unattended [unattended]', 'Run the command without prompts.')
        .option('--admin [admin]', 'Add Admin to project.')
        .option('--api [api]', 'Add Actinium to project')
        .on('--help', HELP);

module.exports = {
    ACTION,
    COMMAND,
    ID: NAME,
};
