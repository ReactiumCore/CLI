import Actions from './actions.js';

export default ({ params, props }) => {
    const { ActionSequence, ora } = arcli;

    const spinner = ora({
        spinner: 'dots',
        color: 'cyan',
    });

    const actions = Actions(spinner);

    spinner.start('Actinium installing...');

    return ActionSequence({
        actions,
        options: { params, props },
    })
        .then(success => {
            spinner.succeed('Actinium install complete!');
            return success;
        })
        .catch(error => {
            spinner.fail('Actinium install error!');
            return error;
        });
};
