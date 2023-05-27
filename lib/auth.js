export default ({ params, props }) => {
    const { op } = arcli;

    const { config } = props;

    if (!config) {
        return Promise.reject({ msg: 'props.config is a required parameter' });
    }

    const app = op.get(
        params,
        'app',
        op.get(config, 'registry.app', 'Actinium'),
    );

    const serverURL = op.get(
        params,
        'server',
        op.get(config, 'registry.server'),
    );

    if (!serverURL) {
        return Promise.reject({
            msg: 'params.server is a required parameter',
        });
    }

    const sessionToken = op.get(
        params,
        'sessionToken',
        op.get(config, 'registry.sessionToken'),
    );

    Actinium.initialize(app);
    Actinium.serverURL = serverURL;

    if (sessionToken && !op.get(params, 'clear')) {
        return Actinium.Cloud.run(
            'session-validate',
            {},
            { sessionToken },
        ).then(() => sessionToken);
    } else {
        let { password, username } = params;
        if (!password || !username) {
            return Promise.reject({
                msg:
                    'params.username and params.password are required parameters',
            });
        }

        return Actinium.User.logIn(username, password).then(user =>
            user.getSessionToken(),
        );
    }
};
