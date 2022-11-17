export default spinner => {
    const { path, chalk, decompress, fs, op, request } = arcli;

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
                    'config.reactium.repo',
                    'https://github.com/Atomic-Reactor/Reactium/archive/master.zip',
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
                            normalize(cwd, 'tmp', 'reactium.zip'),
                        ),
                    )
                    .on('error', error => {
                        spinner.stop();
                        console.log(error);
                        process.exit();
                    })
                    .on('close', () => resolve({ action, status: 200 }));
            });
        },

        unzip: ({ params, props, action }) => {
            const { cwd } = props;

            message('unpacking...');

            const zipFile = normalize(cwd, 'tmp', 'reactium.zip');

            return decompress(zipFile, cwd, { strip: 1 });
        },

        prettier: ({ params, props, action }) => {
            message('updating prettier ignore...');

            const { cwd } = props;
            const prettierFile = normalize(cwd, '.prettierignore');

            const cont = fs.readFileSync(prettierFile);

            fs.writeFileSync(prettierFile, `.core\n${cont}`);
        },

        cleanup: ({ params, props, action }) => {
            const { cwd } = props;

            message('removing temp files...');

            return new Promise((resolve, reject) => {
                fs.remove(normalize(cwd, 'tmp'), error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ action, status: 200 });
                    }
                });
            });
        },

        deps: ({ params }) => {
            if (params.quick) return;
            if (spinner) spinner.stop();
            console.log('');
            console.log(`Installing ${chalk.cyan('Reactium')} dependencies...`);
            console.log('');
            return arcli.runCommand('arcli', ['install', '-s']);
        },
    };
};
