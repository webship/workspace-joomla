#!/usr/bin/env bash

argparse "$@" <<ARGEOF || exit 1
parser.add_argument('PROJECT_NAME',
                    help='The name of the project: its folder, its DDEV project and its host name.')
parser.add_argument('-v', '--version',
                    default="${site_version}",
                    help='The Joomla release to download: latest, or a version number. Example: --version 6.2.0 [default %(default)s]')
parser.add_argument('-i', '--install',
                    action='store_true',
                    default=False,
                    help='Install Joomla, with the workspace account as the Super User.')
parser.add_argument('-a', '--add-users',
                    action='store_true',
                    default=False,
                    help='With --install, add the default accounts: one per user group, the ones the test scenarios log in as.')
parser.add_argument('-s', '--sample-data',
                    action='store_true',
                    default=False,
                    help='With --install, add the blog sample data of Joomla: articles, a menu and modules.')
parser.add_argument('-l', '--launch',
                    action='store_true',
                    default=False,
                    help='Open the site in a browser when it is ready.')
parser.add_argument('--php-version',
                    default="8.3",
                    choices=['8.5', '8.4', '8.3'],
                    help='PHP version for the project container. Example: --php-version 8.4 [default %(default)s]')
ARGEOF
