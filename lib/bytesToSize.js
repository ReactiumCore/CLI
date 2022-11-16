export default (bytes, color) => {
    const { chalk } = arcli;
    color = color ? chalk[color] : chalk.cyan;
    const sizes = ['bytes', 'kb', 'mb', 'gb', 'tb'];
    if (bytes === 0) return color('0 ') + color(sizes[0]);
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return (
        color(Math.round(bytes / Math.pow(1024, i), 2)) + ' ' + color(sizes[i])
    );
};
