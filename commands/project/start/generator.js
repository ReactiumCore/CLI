const op = require('object-path');
const ActionSequence = require('action-sequence');
const fs = require('fs-extra');

const { arcli, Hook, Spinner } = global;

module.exports = ({ arcli, params, props }) => {
    console.log('');

    // TODO: get project config from command
    params.project = fs.readJSONSync(
        arcli.normalizePath(props.cwd, 'project.json'),
        { throws: false },
    );

    let actions = {};

    const onError = error => {
        console.log({error});
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

    if (op.get(params, 'project.api', false)) {
        actions = arcli.mergeActions(actions, require('./actions/api')());
    }

    if (op.get(params, 'project.admin', false)) {
        actions = arcli.mergeActions(actions, require('./actions/admin')());
    }

    if (op.get(params, 'project.app', false)) {
        actions = arcli.mergeActions(actions, require('./actions/app')());
    }

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
