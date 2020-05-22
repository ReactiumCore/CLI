const op = require('object-path');
const ActionSequence = require('action-sequence');
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

    const namespace = (params.namespace = op.get(params, 'project.project'));
    const actions = params.project ? require(`./actions/stop`)() : {};

    // Run actions hook
    try {
        Hook.runSync('project-stop-actions', {
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
            let message = 'project stop complete!';

            // Run complete hook
            try {
                Hook.runSync('project-stop-complete', {
                    arcli,
                    params,
                    props,
                    message,
                    success,
                });
                console.log('');
            } catch (error) {
                return onError(error);
            }

            return success;
        })
        .catch(onError);
};
