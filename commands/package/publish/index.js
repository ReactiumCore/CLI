/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
import GENERATOR from './generator.js';

const {
    _,
    chalk,
    inquirer,
    fs,
    normalizePath,
    op,
    path,
    prefix,
    semver,
} = arcli;

const { cwd } = arcli.props;

const pkgFile = normalizePath(cwd, 'package.json');

const getPackage = () =>
    fs.existsSync(pkgFile)
        ? fs.readJsonSync(pkgFile)
        : {
              version: '0.0.1',
              scripts: {
                  test: 'echo "Error: no test specified" && exit 1',
              },
              keywords: [],
              reactium: {},
              actinium: {},
          };

const getPackageVersion = inc => {
    let { version } = getPackage();
    version = semver.coerce(version).version;
    return inc ? semver.inc(version, inc) : version;
};

/**
 * NAME String
 * @description Constant defined as the command name. Value passed to the commander.command() function.
 * @example $ arcli publish
 * @see https://www.npmjs.com/package/commander#command-specific-options
 * @since 2.0.0
 */
export const NAME = 'publish';

/**
 * DESC String
 * @description Constant defined as the command description. Value passed to
 * the commander.desc() function. This string is also used in the --help flag output.
 * @see https://www.npmjs.com/package/commander#automated---help
 * @since 2.0.0
 */
const DESC = 'Publish an Actinium or Reactium module';

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
const CONFORM = input =>
    Object.keys(input).reduce((obj, key) => {
        let val = input[key];
        switch (key) {
            case 'ver':
                const incs = ['major', 'minor', 'patch'];
                obj['version'] = incs.includes(String(val).toLowerCase())
                    ? semver.inc(getPackageVersion(), val)
                    : semver.coerce(val).version;
                break;

            case 'version':
                obj['version'] = semver.coerce(val).version;
                break;

            case 'name':
                obj['name'] = String(val)
                    .toLowerCase()
                    .replace(/\s\s+/g, ' ')
                    .replace(/[^0-9a-z@\-\/]/gi, '-');
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
const FLAGS = [
    'actinium',
    'app',
    'author',
    'description',
    'license',
    'name',
    'private',
    'reactium',
    'server',
    'ver',
];

/**
 * FLAGS_TO_PARAMS Function
 * @description Create an object used by the prompt.override property.
 * @since 2.0.18
 */
const FLAGS_TO_PARAMS = opt =>
    FLAGS.reduce((obj, key) => {
        let val = opt[key];
        val = typeof val === 'function' ? undefined : val;

        if (val) {
            key = key === 'private' ? 'priv' : key;
            obj[key] = val;
        }

        return obj;
    }, {});

const PROMPT = {};
PROMPT.TMPDIR = params => {
    params.tmpDir = normalizePath(
        arcli.props.homedir,
        '.arcli',
        'tmp',
        'publish',
        path.basename(cwd),
    );

    return params;
};

PROMPT.AUTH = async (params, props) => {
    const sessionToken = op.get(props, 'config.registry.sessionToken');
    const appID = op.get(props, 'config.registry.app', 'ReactiumRegistry');
    const serverURL = op.get(
        props,
        'config.registry.server',
        'https://v1.reactium.io/api',
    );

    const { username, password } = await inquirer.prompt(
        [
            {
                prefix,
                name: 'username',
                type: 'input',
                message: 'Username:',
                when: !sessionToken,
            },
            {
                prefix,
                name: 'password',
                type: 'password',
                message: 'Password:',
                when: !sessionToken,
            },
        ],
        params,
    );

    params.appID = appID;
    params.serverURL = serverURL;
    params.sessionToken = sessionToken;
    params.username = username;
    params.password = password;

    return params;
};

PROMPT.PKG = async params => {
    const PACKAGE = getPackage();

    const {
        actinium,
        author,
        description,
        license,
        name,
        priv,
        reactium,
        ver,
    } = await inquirer.prompt(
        [
            {
                prefix,
                name: 'ver',
                type: 'input',
                askAnswered: true,
                default: getPackageVersion('patch'),
                message: 'Version:',
            },
            {
                prefix,
                name: 'priv',
                default: false,
                type: 'confirm',
                message: 'Private:',
            },
            {
                prefix,
                name: 'actinium',
                message: 'Minimum Actinium Version:',
                default: '3.6.6',
            },
            {
                prefix,
                name: 'reactium',
                message: 'Minium Reactium Version:',
                default: '3.2.6',
            },
            {
                prefix,
                name: 'name',
                type: 'input',
                message: 'Plugin Name:',
            },
            {
                prefix,
                name: 'description',
                type: 'input',
                message: 'Plugin Description:',
            },
            {
                prefix,
                name: 'author',
                type: 'input',
                message: 'Plugin Author:',
            },
            {
                prefix,
                name: 'license',
                type: 'input',
                message: 'Plugin License:',
            },
        ],
        { ...params, ...PACKAGE },
    );

    params.version = ver;
    params.private = priv;
    params.pkg = {
        actinium: {},
        reactium: {},
        ...PACKAGE,
        description,
        name,
        license,
        author,
        version: ver,
    };

    if (_.isString(actinium)) {
        params.pkg.actinium.version = actinium;
    }
    if (_.isString(reactium)) {
        params.pkg.reactium.version = reactium;
    }

    return params;
};

const PKG_TO_PARAMS = () => {
    const pkg = getPackage();

    const keys = ['author', 'app', 'description', 'private', 'license', 'name'];

    const pkeys = Object.keys(pkg);

    const newPkg = keys.reduce((obj, key) => {
        if (pkeys.includes(key)) {
            obj[key] = op.get(pkg, key);
        }
        return obj;
    }, {});

    return newPkg;
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
    console.log('');

    let params = {
        pkg: PKG_TO_PARAMS(),
        ...FLAGS_TO_PARAMS(opt),
    };

    try {
        for (let P of Object.values(PROMPT)) {
            await P(params, props);
        }
    } catch (err) {
        console.log(err);
        process.exit();
    }

    params = CONFORM(params);

    return GENERATOR({ params, props });
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
        .option(
            '-a, --app [app]',
            'Plugin registry application ID. Used when server plugins from a custom registry server. Default: ReactiumRegistry',
        )

        .option(
            '-p, --private [private]',
            'Make the plugin available to ACL targets only',
        )
        .option('-s, --server [server]', 'Server URL')
        .option('--ver [ver]', 'Plugin semver. Default: 0.0.1')
        .option(
            '--actinium [actinium]',
            'Minimum Actinium version required to install the plugin',
        )
        .option(
            '--reactium [reactium]',
            'Minimum Reactium version required to install the plugin',
        )
        .option('--description [description]', 'Plugin description')
        .option('--author [author]', 'Plugin author')
        .option('--license [license]', 'Plugin license')
        .option('--name [name]', 'Plugin name used when installing the plugin')
        .on('--help', HELP);
