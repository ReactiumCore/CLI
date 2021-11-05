module.exports = spinner => {
    spinner = spinner || arcli.Spinner;

    const { config, cwd, root } = arcli.props;
    const { chalk, fs, homedir, normalizePath, op, path } = arcli;

    const message = text => {
        if (spinner) {
            if (!spinner.isSpinning) spinner.start();
            spinner.text = text;
        }
    };

    const now = Date.now();
    const file = normalizePath(homedir, '.arcli', 'config.json');
    const backupDir = normalizePath(homedir, '.arcli', '.BACKUP');
    const backupFile = normalizePath(backupDir, `${now}.config.json`);

    return {
        backup: () => {
            message(`creating ${chalk.magenta('config.json')} backup...`);

            fs.ensureDirSync(backupDir);
            fs.copySync(file, backupFile);
        },

        update: ({ params, props, action }) => {
            message(`updating ${chalk.magenta('config.json')}...`);

            const { newConfig } = params;
            const fileContent = JSON.stringify(newConfig, null, 2);

            fs.writeFileSync(file, fileContent);
        },
    };
};
