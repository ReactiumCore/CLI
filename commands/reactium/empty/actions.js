export default spinner => {
    const { chalk, path, fs } = arcli;

    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    const normalize = (...args) => path.normalize(path.join(...args));

    return {
        empty: async ({ params, props }) => {
            const { cwd } = props;

            if (params.style) {
                message(`Removing ${chalk.cyan('styles')}...`);

                const stylesPath = normalize(`${cwd}/src/assets/style`);
                fs.emptyDirSync(stylesPath);
                fs.ensureFileSync(normalize(`${stylesPath}/style.scss`));
            }

            if (params.font) {
                message(`Removing ${chalk.cyan('fonts')}...`);

                const fontsPath = normalize(`${cwd}/src/assets/fonts`);
                fs.emptyDirSync(fontsPath);
            }

            if (params.images) {
                message(`Removing ${chalk.cyan('images')}...`);

                const imagesPath = normalize(`${cwd}/src/assets/images`);
                fs.emptyDirSync(imagesPath);
            }

            if (params.demo) {
                message(`Removing ${chalk.cyan('demo')}...`);

                const demoPaths = [
                    normalize(`${cwd}/src/app/components/Demo`),
                    normalize(`${cwd}/src/app/components/common-ui/form`),
                    normalize(`${cwd}/src/app/components/common-ui/Icon`),
                ].forEach(p => fs.removeSync(p));
            }
        },
    };
};
