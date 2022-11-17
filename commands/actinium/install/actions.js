export default spinner => {
    const { chalk, decompress, fs, op, path, request } = arcli;

    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    const normalize = (...args) => path.normalize(path.join(...args));

    return {
        download: ({ params, props, action }) => {
            const { cwd } = props;
            const { tag } = params;

            message('downloading payload, this may take awhile...');

            // Create the tmp directory if it doesn't exist.
            fs.ensureDirSync(normalize(cwd, 'tmp'));

            // Get the download url
            let URL = String(
                op.get(
                    props,
                    'config.actinium.repo',
                    'https://github.com/Atomic-Reactor/Actinium/archive/master.zip',
                ),
            );

            if (tag && tag !== 'latest' && URL.endsWith('/master.zip')) {
                URL = URL.replace('/master.zip', `/refs/tags/${tag}.zip`);
            }

            // Download
            return new Promise((resolve, reject) => {
                request(URL)
                    .pipe(
                        fs.createWriteStream(
                            normalize(cwd, 'tmp', 'actinium.zip'),
                        ),
                    )
                    .on('error', error => {
                        console.log(error);
                        process.exit();
                    })
                    .on('close', () => resolve({ action, status: 200 }));
            });
        },

        unzip: ({ params, props, action }) => {
            const { cwd } = props;
            message('unpacking...');
            const zipFile = normalize(cwd, 'tmp', 'actinium.zip');
            return decompress(zipFile, cwd, { strip: 1 });
        },

        cleanup: ({ params, props, action }) => {
            const { cwd } = props;
            message('removing temp files...');
            fs.removeSync(normalize(cwd, 'tmp'));
        },

        deps: ({ props }) => {
            if (spinner) spinner.stop();
            console.log('');
            console.log(`Installing ${chalk.cyan('Actinium')} dependencies...`);
            console.log('');
            return arcli.runCommand('arcli', ['install', '-s']);
        },
    };
};
