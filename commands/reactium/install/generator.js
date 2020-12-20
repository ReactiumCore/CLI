
const ora = require('ora');
const ActionSequence = require('action-sequence');


const spinner = ora({
    spinner : 'dots',
    color   : 'cyan'
});



module.exports = ({ params, props }) => {
    spinner.start('Reactium installing...');

    const { empty } = params;

    let actions = require('./actions')(spinner);

    if (empty) {
        params['demo'] = true;
        params['font'] = true;
        params['images'] = true;
        params['style'] = true;
        params['toolkit'] = true;

        const emptyActions = require('../empty/actions')(spinner);
        actions = { ...actions, ...emptyActions };
    }

    return ActionSequence({
        actions,
        options: { params, props }
    }).then((success) => {
        spinner.succeed('Reactium install complete!');
        return success;
    }).catch((error) => {
        spinner.fail('Reactium install error!');
        console.error(error);
        return error;
    });
};
