export default spinner => {
    let config, isAuth, isValid;

    const { _, Auth, AuthUpdate, AuthValidated, chalk, op, useSpinner } = arcli;

    const { complete, error, message } = useSpinner(spinner);

    return {
        authInit: ({ params }) => {
            config = { ...arcli.props.config };
            isAuth = op.get(params, 'username') && op.get(params, 'password');
        },
        authClear: ({ params }) => {
            if (op.get(params, 'clear')) {
                op.del(config, 'registry.sessionToken');

                message(`Clearing session token${chalk.cyan('...')}`);

                AuthUpdate({ config });

                complete('Cleared session token!');
            }
        },
        authValidate: async ({ params }) => {
            if (op.get(params, 'clear') === true) {
                isValid = false;
                error('Invalid session token');
                return;
            }

            isValid = await AuthValidated({ params });
            if (isValid === true) complete('Authenticated');
            else if (!isAuth) error('Invalid session token');
        },
        auth: async ({ params }) => {
            if (!isAuth || isValid) return;

            message(`Authenticating${chalk.cyan('...')}`);

            const sessionToken = await Auth({ params });

            if (_.isString(sessionToken)) {
                AuthUpdate({ params: { sessionToken } });
                complete('Authenticated');
            } else {
                const err =
                    op.get(sessionToken, 'msg') ||
                    op.get(sessionToken, 'message');

                error(err);
            }
        },
    };
};
