export default spinner => {
    const { chalk, fs, homedir, normalizePath, useSpinner } = arcli;

    const { message } = useSpinner(spinner);

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

        update: ({ params }) => {
            message(`updating ${chalk.magenta('config.json')}...`);

            const { newConfig } = params;
            const fileContent = JSON.stringify(newConfig, null, 2);

            fs.writeFileSync(file, fileContent);
        },
    };
};
