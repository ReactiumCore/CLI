
const generator = require('../commands/reactium/install/generator');
const config    = require("../config.json");
const expect    = require('chai').expect;
const path      = require('path');

const props =  {
    cwd  : path.normalize(path.join(__dirname, 'cwd', 'install')),
    root : path.normalize(path.join(__dirname, '..')),
    config,
};

const params = {
    overwrite: true,
    confirm: true,
};

describe(`arcli re:install -> ${props.cwd}`, function () {
    this.timeout(10000);

    it ('All actions complete', () => {
        return generator({ props, params }).then(success => {
            return expect(Object.values(success)).to.have.lengthOf.at.least(1);
        });
    });
});
