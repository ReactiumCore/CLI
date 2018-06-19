module.exports = {
    themes: [
        {name: 'Default', css: '/assets/style/style.css', selected: true},
    ],
    menu: {},
    settings: [
        {
            text: ['Sidebar position: left', 'Sidebar position: right'],
            values: ['left', 'right'],
            pref: 'sidebar.position',
            labels: ['R', 'L'],
            default: 'left',
        },
        {
            text: ['Expand documentation', 'Collapse documentation'],
            values: [false, true],
            pref: 'docs.all',
            help: 'Expand or collapse all documentation',
            default: false,
        },
        {
            text: ['Expand DNA', 'Collapse DNA'],
            values: [false, true],
            pref: 'link.all',
            help: 'Expand or collapse all DNA views',
            default: false,
        },
        {
            text: ['Expand code view', 'Collapse code view'],
            values: [false, true],
            pref: 'code.all',
            help: 'Expand or collapse all code views',
            default: false,
        },
        {
            text: ['Syntax highlighting: light', 'Syntax highlighting: dark'],
            values: ['light', 'dark'],
            pref: 'codeColor.all',
            help: 'Switch the code view syntax highlighting',
            default: 'dark',
        },
    ],
    header: {
        logo: '/assets/images/logo.png',
        title: 'Style Guide',
        version: 'ver 2.0.1',
    },
    sidebar: {
        closed   : false,
        position : 'left',
    },
    toolbar: {
        buttons: [
            {icon:'#re-icon-dna', name: 'filter-all', label: 'All Elements'},
            {icon: '#re-icon-atom', name: 'filter-atom', label: 'Atoms'},
            {icon: '#re-icon-molecule', name: 'filter-molecule', label: 'Molecules'},
            {icon: '#re-icon-organism', name: 'filter-organism', label: 'Organisms'},
            {icon: '#re-icon-catalyst', name: 'filter-catalyst', label: 'Catalyst'},
            {icon: '#re-icon-page', name: 'filter-page', label: 'Pages'},
            {icon: '#re-icon-template', name: 'filter-template', label: 'Templates'},
            {name: 'spacer'},
            {icon: '#re-icon-settings', name: 'toggle-settings', cls: 'toggle'}
        ]
    },
};
