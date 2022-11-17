import Actions from './actions.js';

const generator = async ({ params, props }) => {
    console.log('');

    const { ActionSequence, ora } = arcli;

    const spinner = ora({
        spinner: 'dots',
        color: 'cyan',
    });

    spinner.start();

    const actions = Actions(spinner);

    return ActionSequence({
        actions,
        options: { params, props },
    })
        .then(success => {
            spinner.succeed('Actinium update complete!');
            return success;
        })
        .catch(error => {
            spinner.fail('error!');
            console.log(error);
            return error;
        });
};

export default generator;
