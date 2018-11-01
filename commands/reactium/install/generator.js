
const ora = require('ora');
const ActionSequence = require('action-sequence');


const spinner = ora({
    spinner : 'dots',
    color   : 'cyan'
});

const actions = require('./actions')(spinner);

module.exports = ({ params, props }) => {
    spinner.start('Reactium installing...');

    return ActionSequence({
        actions,
        options: { params, props }
    }).then((success) => {
        spinner.succeed('Reactium install complete!');
        return success;
    }).catch((error) => {
        spinner.fail('Reactium install error!');
        return error;
    });
};
