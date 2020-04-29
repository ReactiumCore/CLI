const path = require('path');
const mod = path.dirname(require.main.filename);
const homedir = require('os').homedir();
const auth = require(`${mod}/lib/auth`);
const prettier = require('prettier');
const op = require('object-path');
const _ = require('underscore');
const chalk = require('chalk');
const fs = require('fs-extra');


module.exports = spinner => {
    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    let sessionToken;

    return {
        auth: ({ action, params, props }) => {
            if (op.get(params, 'username')) {
                message(`Authenticating${chalk.cyan('...')}`);
            }

            return auth({ params, props }).then(result => {
                sessionToken = result;
            });
        },
        updateConfig: ({ action, params, props }) => {
            const configFilePath = path.normalize(
                path.join(homedir, '.arcli', 'config.json'),
            );

            let config = op.get(props, 'config', {});

            if (op.get(config, 'registry.sessionToken') !== sessionToken) {
                const { update } = require(`${mod}/commands/config/set/actions`)(
                    spinner,
                );

                if (op.get(params, 'server')) {
                    op.set(config, 'registry.server', params.server);
                }
                
                op.set(config, 'registry.sessionToken', sessionToken);
                op.set(params, 'newConfig', config);
                return update({ action: 'update', params, props });
            }
        },
    };
};
