# Atomic Reactor CLI
<img src="https://preview.ibb.co/kcaAQG/atomic_reactor.png" alt="atomic_reactor" border="0" style="width: 100%; height: auto;" />

A command-line interface for generating Atomic Reactor elements.

# Install
```npm install -g atomic-reactor-cli```

# Commands
```
  Usage: arcli [command] [options]


  Options:

    -V, --version  output the version number
    -h, --help     output usage information


  Commands:

    set <type> [options]            Set Atomic Reactor CLI configuration key:value pairs

    act:gen <type> [options]        Generates the specified Actinium module <type>: helper | plugin | widget | theme
    act:list                        Lists installed modules and helpers
    act:backup [options]            Backup MongoDB <db> to directory <path>
    act:restore [options]           Restore MongoDB <db> from directory <path>
    act:install [options]           Install Actinium in the current working directory
    act:launch                      Launch Actinium local development environment
    act:build                       Build Actinium for deployment

    kit:install [options]           Installs Toolkit in the current working directory
    kit:gen <type> [options]        Generates the specified toolkit element <type>: atom | catalyst | helper | molecule | organism | style | template
    kit:launch [options]            Launch Butter and listen for changes
    kit:build                       Build Butter
    kit:eject [path]                Ejects the toolkit `~/dist/assets` directory to the specified <path>
    kit:cleanse                     Removes all materials, views, and styles
    kit:infuse <toolkit> [options]  Add a UI toolkit to the project
    kit:defuse <toolkit> [options]  Remove a UI toolkit from the project

    re:install [options]            Installs Reactium in the current working directory
    re:gen <type> [options]         Generates a new react component <type>: function | class | actions | types | reducers | services | route | style
    re:kit <type> [options]         Generate Reactium Toolkit element <type>: atom | molecule | organism | catalyst | page | template | group | style
```
