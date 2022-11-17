import Actions from './actions';
import EmptyActions from '../empty/actions.js';

export default ({ params, props }) => {
    const { chalk, ora, ActionSequence } = arcli;

    const spinner = ora({
        spinner: 'dots',
        color: 'cyan',
    });

    spinner.start(`Installing ${chalk.cyan('Reactium')}...`);

    const { empty } = params;

    // we want deps to be last so move it out of the actions object
    let { deps, ...actions } = Actions(spinner);

    if (empty) {
        params['demo'] = true;
        params['font'] = true;
        params['images'] = true;
        params['style'] = true;
        params['toolkit'] = true;

        const emptyActions = EmptyActions(spinner);
        actions = { ...actions, ...emptyActions };
    }

    // add deps back in at the end 
    actions = { ...actions, deps };

    return ActionSequence({
        actions,
        options: { params, props },
    })
        .then(success => {
            console.log('');
            spinner.succeed('Reactium install complete!');
            return success;
        })
        .catch(error => {
            console.log('');
            spinner.fail('Reactium install error!');
            console.error(error);
            return error;
        });
};
