const op = require('object-path');
const ActionSequence = require('action-sequence');
const fs = require('fs-extra');

const { arcli, Hook, Spinner } = global;

module.exports = ({ arcli, params, props }) => {
    console.log('');

    const onError = error => {
        console.log({ error });
        let message = op.get(error, 'message', error);
        Hook.runSync('project-start-error', {
            arcli,
            message,
            params,
            props,
        });

        Spinner.fail(message);
        return new Error(message);
    };

    // TODO: get project config from command
    params.project = fs.readJSONSync(
        arcli.normalizePath(props.cwd, 'project.json'),
        { throws: false },
    );

    const namespace = (params.namespace = op.get(params, 'project.project'));
    const defaultConfig = {
        namespace,
        script: 'npm',
        args: ['run', 'local'],
        watch: false,
        env: {
            NODE_ENV: 'development',
        },
    };

    const prepareEnvFactory = type => (config, port) => {
        op.set(config, 'env.PORT', port);
        if (type === 'reactium') {
            op.set(config, 'env.APP_PORT', port);
            op.set(config, 'env.BROWSERSYNC_PORT', port + 1);
            op.set(
                config,
                'env.REST_API_URL',
                `http://localhost:${op.get(params, 'api.port', 9000)}/api`,
            );
        }
    };

    const apps = [
        {
            name: 'api',
            cwd: './API',
            portRange: [9000, 9100],
            prepareEnv: prepareEnvFactory('actinium'),
        },
        {
            name: 'admin',
            cwd: './ADMIN',
            portRange: [3000, 3100],
            prepareEnv: prepareEnvFactory('reactium'),
        },
        {
            name: 'app',
            cwd: './APP',
            portRange: [4000, 4100],
            prepareEnv: prepareEnvFactory('reactium'),
        },
    ];

    let actions = {};
    apps.forEach(app => {
        const { name, cwd, portRange, prepareEnv } = app;
        if (op.get(params, `project.${name}`, false)) {
            op.set(params, name, {
                portRange,
                prepareEnv,
                config: {
                    ...defaultConfig,
                    name,
                    cwd,
                },
            });

            actions = arcli.mergeActions(
                actions,
                require(`./actions/local`)(name),
            );
        }
    });

    actions = arcli.mergeActions(actions, require('./actions/close')());

    // Run actions hook
    try {
        Hook.runSync('project-start-actions', {
            actions,
            arcli,
            params,
            props,
        });
    } catch (error) {
        onError(error);
    }

    return ActionSequence({
        actions,
        options: { arcli, params, props },
    })
        .then(success => {
            let message = 'project start complete!';

            // Run complete hook
            try {
                Hook.runSync('project-start-complete', {
                    arcli,
                    params,
                    props,
                    message,
                    success,
                });

                Spinner.succeed(message);
            } catch (error) {
                return onError(error);
            }

            return success;
        })
        .catch(onError);
};
