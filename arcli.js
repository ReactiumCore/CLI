#!/usr/bin/env node

"use strict";

// Imports
const config = require(__dirname + "/config.json");
const ver = require("./package").version;
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const program = require("commander");
const prompt = require("prompt");
const globby = require("globby").sync;
const op = require("object-path");
const axios = require("axios");
const cwd = path.resolve(process.cwd());
const semver = require("semver");

// Build the props object
const props = { cwd, root: __dirname, prompt, config };

// Get application config
const appConfigFile = path.normalize(`${cwd}/.core/.cli/config.json`);
if (fs.existsSync(appConfigFile)) {
  const appConfig = require(appConfigFile);
  props.config = Object.assign(props.config, appConfig);
}

// Get project config
const projConfigFile = path.normalize(`${cwd}/.cli/config.json`);
if (fs.existsSync(projConfigFile)) {
  const projConfig = require(projConfigFile);
  props.config = Object.assign(props.config, projConfig);
}

axios
  .get(
    "https://raw.githubusercontent.com/Atomic-Reactor/CLI/master/package.json"
  )
  .then(result => {
    const { version: currentVersion } = result.data;
    if (semver.lt(ver, currentVersion)) {
      console.log("\n");
      console.log(
        chalk.red(
          `Yo... you're using ARCLI version: ${ver}. You should update to ${currentVersion}`
        )
      );
      console.log(chalk.cyan("  $ npm i -g atomic-reactor-cli"));
      console.log("\n");
    }
    // Configure prompt
    prompt.message = chalk[config.prompt.prefixColor](config.prompt.prefix);
    prompt.delimiter = config.prompt.delimiter;

    // Initialize the CLI
    program.version(ver, "-v, --version");
    program.usage("<command> [options]");

    // Find commands
    const dirs = config.commands || [];
    const globs = dirs.map(dir =>
      String(`${dir}/**/*index.js`)
        .replace(/\[root\]/gi, props.root)
        .replace(/\[cwd\]/gi, props.cwd)
    );

    /**
     * Since commands is an Object, you can replace pre-defined commands with custom ones.
     * The order in which commands are aggregated:
     * 1. CLI Root : ./commands
     * 2. Core     : ~/PROJECT/.core/.cli/commands -> overwrites CLI Root.
     * 3. Project  : ~/PROJECT/.cli/commands       -> overwrites CLI Root & Core.
     */
    const commands = {};
    globby(globs).forEach(cmd => {
      const req = require(cmd);
      if (
        op.has(req, "NAME") &&
        op.has(req, "COMMAND") &&
        typeof req.COMMAND === "function"
      ) {
        commands[req.NAME] = req;
      }
    });

    // Apply commands
    Object.values(commands).forEach(req => req.COMMAND({ program, props }));

    // Is valid command?
    if (process.argv.length > 2) {
      const command = process.argv[2];
      const isFlag = String(command).substr(0, 1) === "-";

      if (
        !Object.keys(commands).find(key =>
          new RegExp(`^${command}`).test(key)
        ) &&
        !isFlag
      ) {
        console.log("\n");
        console.log(chalk.red("Invalid command:"), chalk.cyan(command));
        console.log("\n");
        program.help();
        return;
      }
    }

    // Start the CLI
    program.parse(process.argv);

    // Output the help if nothing is passed
    if (!process.argv.slice(2).length) {
      program.help();
    }
  })
  .catch(err => {
    console.log(err);
  });
