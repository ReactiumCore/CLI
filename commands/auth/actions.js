import Auth from '../../../lib/auth.js';
import UpdateActions from '../../../commands/config/set/actions.js';

export default spinner => {
    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    let sessionToken;

    const { _, chalk, op } = arcli;

    return {
        auth: async ({ action, params, props }) => {
            if (op.get(params, 'username')) {
                message(`Authenticating${chalk.cyan('...')}`);
            }

            sessionToken = await Auth({ params, props });
        },
        authUpdateConfig: async ({ action, params, props }) => {
            let config = op.get(props, 'config', {});

            if (op.get(config, 'registry.sessionToken') !== sessionToken) {
                if (op.get(params, 'server')) {
                    op.set(config, 'registry.server', params.server);
                }

                op.set(config, 'registry.sessionToken', sessionToken);
                arcli.props.config = config;
                op.set(params, 'newConfig', config);

                return UpdateActions.update({
                    action: 'update',
                    params,
                    props,
                });
            }
        },
    };
};
