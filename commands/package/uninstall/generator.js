import Actions from './actions.js';

export default ({ params, props }) => {
    const { ActionSequence, ora, } = arcli;
    
    const spinner = ora({ spinner: 'dots', color: 'cyan' });

    spinner.start();

    const actions = Actions(spinner);

    return ActionSequence({ actions, options: { params, props } })
        .then(() => console.log(''))
        .catch(error => {
            spinner.fail('error!');
            console.log(error);
            return error;
        });
};
