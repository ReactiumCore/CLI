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

    const actions = require(`./actions/status`)();

    // Run actions hook
    try {
        Hook.runSync('project-status-actions', {
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
            let message = 'project status complete!';

            // Run complete hook
            try {
                Hook.runSync('project-status-complete', {
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
