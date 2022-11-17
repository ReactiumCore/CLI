const { chalk, op } = arcli;

export const NAME = 'reactium';
const DESC = 'Reactium: Command used to install, update, or empty Reactium.';

const HELP = props => {
    const actions = Object.keys(props.subcommands[NAME]);
    actions.sort();

    console.log('');
    console.log('Actions:');
    console.log(' ', actions.map(act => chalk.cyan(act)).join(', '));
    console.log('');
    console.log('Example:');
    actions.forEach(act =>
        console.log(`  $ arcl`, chalk.magenta(NAME), chalk.cyan(act), '-h'),
    );
    console.log('');
    console.log('Beware:');
    console.log(`  ${chalk.cyan('Install')} will overwrite existing files.`);
    console.log(
        ' ',
        chalk.cyan('Update'),
        ' will overwrite existing',
        chalk.magenta('~/.core'),
        'files and possibly alter the',
        chalk.magenta('~/package.json'),
        'file.',
    );
    console.log('');
};

export const COMMAND = ({ program, props }) => {
    const ACT = props.args[3];
    const { subcommands = {} } = props;

    if (NAME === props.args[2] && ACT) {
        const key = `${NAME}.${ACT}`;
        if (!subcommands[key]) {
            console.log('');
            console.log(chalk.red('Invalid command:'), NAME, chalk.cyan(ACT));
            console.log('');
            process.exit();
        }

        return subcommands[key]['COMMAND']({ program, props });
    } else {
        return program
            .command(`${NAME} <action>`)
            .description(DESC)
            .action(() => {})
            .on('--help', () => HELP(props));
    }
};
