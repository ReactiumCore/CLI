export const Session = config => {
    const { op } = arcli;
    config = config || arcli.props.config;
    return op.get(config, 'registry.sessionToken');
};

export const ActiniumInit = (params = {}) => {
    const isInit = global.ACTINIUM_INIT;
    if (isInit === true) return;

    const { op } = arcli;

    const config = arcli.props.config;

    const app =
        op.get(params, 'app') || op.get(config, 'registry.app', 'Actinium');

    const serverURL =
        op.get(params, 'server') || op.get(config, 'registry.server');

    if (app && serverURL) {
        Actinium.initialize(app);
        Actinium.serverURL = serverURL;
        global.ACTINIUM_INIT = true;
    } else {
        throw new Error('unable to initialize Actinium server');
    }
};

export const AuthUpdate = ({ config, params = {} }) => {
    config = config || arcli.props.config;

    const { fs, homedir, normalizePath, op } = arcli;

    const filePath = normalizePath(homedir, '.arcli', 'config.json');

    const map = {
        app: 'registry.app',
        server: 'registry.server',
        sessionToken: 'registry.sessionToken',
    };

    Object.entries(map).forEach(([p, c]) => {
        const val = op.get(params, p);
        if (val) op.set(config, c, val);
    });

    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));

    arcli.props.config = config;

    return config;
};

export const AuthValidated = async ({ params = {} }) => {
    let valid = false;
    const sessionToken = Session();
    if (sessionToken) {
        try {
            ActiniumInit(params);
        } catch (err) {
            return valid;
        }

        try {
            const validate =
                global.AUTH_VALIDATE ||
                Actinium.Cloud.run('session-validate', {}, { sessionToken });

            global.AUTH_VALIDATE = validate;

            valid = await validate;
        } catch (err) {
            valid = false;
        }
    }

    return valid;
};

export const Auth = async ({ params = {} }) => {
    const { password, username } = params;
    if (!password || !username) {
        return {
            msg: 'params.username and params.password are required parameters',
        };
    }

    try {
        ActiniumInit(params);
    } catch (err) {
        return err;
    }

    return Actinium.User.logIn(username, password)
        .then(user => user.getSessionToken())
        .catch(err => err);
};

export { Auth as default };
