const op = require('object-path');
const Parse = require('parse/node');

module.exports = ({ params, props }) => {
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

    Parse.initialize(app);
    Parse.serverURL = serverURL;

    if (sessionToken) {
        return Parse.Cloud.run('session-validate', {}, { sessionToken }).then(
            () => sessionToken,
        );
    } else {
        let { password, username } = params;
        if (!password || !username) {
            return Promise.reject({
                msg:
                    'params.username and params.password are required parameters',
            });
        }

        return Parse.User.logIn(username, password).then(user =>
            user.getSessionToken(),
        );
    }
};
