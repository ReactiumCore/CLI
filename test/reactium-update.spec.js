
require('../bootstrap');
const generator = require('../commands/reactium/update/generator');
const config    = require("../config.json");
const expect    = require('chai').expect;
const path      = require('path');
const fs        = require('fs-extra');

const props =  {
    cwd  : path.normalize(path.join(__dirname, 'cwd', 'install')),
    root : path.normalize(path.join(__dirname, '..')),
    config,
};

const params = {
    overwrite : true,
    confirm   : true,
    quick: true,
};

describe(`arcli re:update -> ${props.cwd}`, function () {
    this.timeout(10000);

    fs.ensureDirSync(`${props.cwd}/.BACKUP/update`);
    fs.emptyDirSync(`${props.cwd}/.BACKUP/update`);

    it ('All actions complete', () => {
        return generator({
            props, params
        }).then(success => {
            return expect(Object.values(success)).to.have.lengthOf.at.least(1);
        }).catch(error => console.log(error));
    });
});
