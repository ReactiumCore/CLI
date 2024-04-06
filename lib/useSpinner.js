export const useSpinner = spinner => {
    const complete = text => {
        if (!spinner) return;
        spinner.start();
        spinner.succeed(text);
    };

    const error = text => {
        if (!spinner) return;
        spinner.start();
        spinner.fail(text);
    };

    const exit = () => {
        if (spinner) spinner.stop();
        console.log('');
        process.exit(1);
    };

    const info = (text, symbol) => {
        const { chalk } = arcli;

        if (!spinner) return;
        symbol = symbol || chalk.cyan('i');
        spinner.start();
        spinner.stopAndPersist({ symbol, text });
    };

    const message = text => {
        if (!spinner) return;
        spinner.start();
        spinner.text = text;
    };

    const start = () => {
        if (!spinner) return;
        spinner.start();
    };

    const stop = () => {
        if (!spinner) return;
        spinner.stop();
    };

    return { complete, error, info, message, start, stop, exit };
};
