export default async ({ actions, params, props }) => {
    const { Spinner: spinner, ActionSequence, chalk } = arcli;
    
    console.log('');
    spinner.start();

    try {
        const success = await ActionSequence({
            actions,
            options: { arcli, params, props },
        });

        spinner.succeed('complete!');
        return success;
    } catch (error) {
        spinner.fail(error.message ? error.message : 'failed!');
        console.error(chalk.red('Error'), error.message ? error.message : error);
        throw error;
    }
};
