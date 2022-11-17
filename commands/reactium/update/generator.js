import Actions from './actions';

export default ({ params, props }) => {
    const { ActionSequence, chalk, ora } = arcli;

    console.log('');

    const spinner = ora({
        spinner: 'dots',
        color: 'cyan',
    });

    spinner.start(`Updating ${chalk.cyan('Reactium')}...`);

    const { core } = params;

    const actions = Actions(spinner);

    if (core === true) {
        delete actions.babel;
        delete actions.gulpfile;
        delete actions.package;
    }

    return ActionSequence({
        actions,
        options: { params, props },
    })
        .then(success => {
            spinner.succeed('Reactium update complete!');
            return success;
        })
        .catch(error => {
            spinner.fail('Reactium update error!');
            console.error(error);
            return error;
        });
};
