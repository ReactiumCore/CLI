import pad from './pad.js';

export default ({ item, index, padding }) => {
    const { chalk } = arcli;
    index += 1;
    let i = chalk.cyan(pad(index, padding) + '.');
    return `\n\t    ${i} ${chalk.white(item)}`;
};
