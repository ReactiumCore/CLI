import ora from 'ora';
import Actions from './actions.js'; 
import ActionSequence from 'action-sequence';


const generator = async ({ params, props }) => {
    const spinner = ora({
        spinner: 'dots',
        color: 'cyan',
    });

    console.log('');
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
