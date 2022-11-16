import chalk from 'chalk';
import _ from 'underscore';
import op from 'object-path';

const { arcli } = global;

module.exports = spinner => {
    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    let UpdateActions, Auth, sessionToken;
    const { root } = global.arcli.props;

    const authFilePath = `${root}/lib/auth`;
    const updateActionsFilePath = `${root}/commands/config/set/actions`;

    return {
        init: async () => {
            Auth = await import(authFilePath);
            UpdateActions = await import(updateActionsFilePath);
        },
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
