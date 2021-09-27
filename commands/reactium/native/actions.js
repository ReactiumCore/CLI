const pkg = require('./package');
const decompress = require('@atomic-reactor/decompress');

module.exports = spinner => {
    let appName, cwd;
    let isNew = false;
    
    const emit = text => {
        if (!spinner) {
            console.log(text);
            return;
        } else {
            spinner.start();
            spinner.text = text;
        }
    };

    return {
        init: async ({ props, params }) => {
            cwd = props.cwd;
            appName = params.name;

            if (!arcli.fs.existsSync(arcli.normalizePath(cwd, '.core'))) {
                isNew = true;
            }
        },
        reactNativeInstall: ({ params }) => {
            if (!isNew) return;
            if (spinner) spinner.stop();
            console.log(`Installing ${arcli.chalk.cyan('React Native')}...\n`);
            return arcli.runCommand('npx', ['react-native', 'init', appName]);
        },
        moveNativeFiles: () => {
            if (!isNew) return;
            const files = arcli.fs.readdirSync(
                arcli.normalizePath(cwd, appName),
            );
            files.forEach(f => {
                if (String(f).includes('node_modules')) return;
                const n = String(f).replace(`/${appName}/`, '/');
                arcli.fs.copySync(arcli.normalizePath(cwd, appName, f), n);
            });
        },
        download: ({ params, props }) => {
            const { tag } = params;

            emit(`downloading ${arcli.chalk.cyan('Reactium')}...`);

            // Create the tmp directory if it doesn't exist.
            arcli.fs.ensureDirSync(arcli.normalizePath(cwd, 'tmp'));

            // Get the download url
            let URL = String(
                arcli.op.get(
                    props,
                    'config.reactiumNative.repo',
                    'https://github.com/Atomic-Reactor/Reactium-Native/archive/main.zip',
                ),
            );
            if (tag && tag !== 'latest' && URL.endsWith('/main.zip')) {
                URL = URL.replace('/main.zip', `/refs/tags/${tag}.zip`);
            }

            // Download
            return new Promise((resolve, reject) => {
                arcli
                    .request(URL)
                    .pipe(
                        arcli.fs.createWriteStream(
                            arcli.normalizePath(cwd, 'tmp', 'reactium.zip'),
                        ),
                    )
                    .on('error', error => {
                        spinner.stop();
                        console.log(error);
                        process.exit();
                    })
                    .on('close', () => resolve({ status: 200 }));
            });
        },

        unzip: () => {
            emit('unpacking...');

            const zipFile = arcli.normalizePath(cwd, 'tmp', 'reactium.zip');
            const dest = arcli.normalizePath(cwd, 'tmp');

            return decompress(zipFile, dest, { strip: 1 });
        },

        package: ({ props }) => {
            emit('updating package.json...');
            spinner.stop();

            // prettier-ignore
            const newPackage = pkg(props, arcli.normalizePath(cwd, 'tmp'));
            const oldPackage = arcli.normalizePath(cwd, 'package.json');

            arcli.fs.writeFileSync(oldPackage, newPackage);
        },

        copyFiles: () => {
            emit('copying files...');

            const dest = arcli.normalizePath(cwd);
            const temp = arcli.normalizePath(cwd, 'tmp');

            const dirs = [arcli.normalizePath(cwd, 'tmp', '.core')];

            if (!arcli.fs.existsSync(arcli.normalizePath(cwd, 'src'))) {
                dirs.push(arcli.normalizePath(cwd, 'tmp', 'src'));
            }

            for (const dir of dirs) {
                const folder = arcli.path.basename(dir);
                arcli.fs.copySync(dir, arcli.normalizePath(cwd, folder));
            }
        },

        files: () => {
            // Add/Remove src files
            const reactium = require(arcli.normalizePath(
                cwd,
                'tmp',
                '.core',
                'reactium-config',
            ));

            const add = arcli.op.get(reactium, 'update.files.add') || [];
            const remove = arcli.op.get(reactium, 'update.files.remove') || [];

            if (add.length < 1 && remove.length < 1) return;

            const currPkg = require(arcli.normalizePath(cwd, 'package.json'));
            const version = arcli.op.get(currPkg, 'version', '0.0.1');
            const reactiumVersion = arcli.op.get(reactium, 'version');

            emit('copying files...');

            // Remove files from src
            // prettier-ignore
            remove.filter(({ version }) => arcli.semver.satisfies(reactiumVersion, version))
                .forEach(({ source }) => {
                    source = arcli.normalizePath(cwd, source);
                    if (arcli.fs.existsSync(source)) {
                        arcli.fs.removeSync(source);
                    }
                });

            // Add files to src
            add.filter(({ version }) =>
                arcli.semver.satisfies(reactiumVersion, version),
            ).forEach(({ destination, overwrite, source }) => {
                destination = arcli.normalizePath(cwd, destination);
                source = arcli.normalizePath(cwd, source);
                if (!arcli.fs.existsSync(destination) || overwrite === true) {
                    arcli.fs.copySync(source, destination);
                }
            });
        },

        prettier: () => {
            if (isNew !== true) return;

            emit('updating prettier ignore...');

            const prettierFile = arcli.normalizePath(cwd, '.prettierignore');

            const cont = arcli.fs.readFileSync(prettierFile);

            arcli.fs.writeFileSync(prettierFile, `.core\n${cont}`);
        },

        iosPodFileRewrite: () => {
            const podfile = arcli.normalizePath(cwd, 'ios', 'Podfile');
            let cont = arcli.fs.readFileSync(podfile);
            cont = String(cont).replace(/ReactiumNative/g, appName);
            arcli.fs.writeFileSync(podfile, cont);
        },

        iosPodInstall: () => {
            if (spinner) spinner.stop();
            console.log('Installing pods...');

            return arcli.runCommand('pod', ['install'], {
                cwd: arcli.normalizePath(cwd, 'ios'),
            });
        },

        cleanup: () => {
            emit('removing temp files...');
            const sweep = [
                arcli.normalizePath(cwd, 'tmp'),
                arcli.normalizePath(cwd, appName),
                arcli.normalizePath(cwd, 'App.js'),
                arcli.normalizePath(cwd, 'src', 'manifest.js'),
            ];

            sweep.forEach(p => arcli.fs.removeSync(p));
        },

        deps: () => {
            if (spinner) spinner.stop();

            // prettier-ignore
            console.log(`\nInstalling ${arcli.chalk.cyan('Reactium')} dependencies...\n`);

            // prettier-ignore
            arcli.fs.ensureDirSync(arcli.normalizePath(cwd, 'reactium_modules'));
            return arcli.runCommand('npx', ['arcli', 'install', '-s']);
        },
    };
};
