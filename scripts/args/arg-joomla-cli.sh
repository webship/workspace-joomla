#!/usr/bin/env bash

argparse "$@" <<ARGEOF || exit 1
parser.add_argument('PROJECT_NAME',
                    help='The Joomla project in this workspace.')
parser.add_argument('-r', '--run',
                    default="_none_",
                    help='A Joomla CLI command to run in the project, without the leading php cli/joomla.php. Example: --run "extension:list --type=plugin"')
parser.add_argument('-u', '--update',
                    action='store_true',
                    default=False,
                    help='Update Joomla itself to the latest release of its line, and clean the cache.')
parser.add_argument('-k', '--check',
                    action='store_true',
                    default=False,
                    help='Look for updates of Joomla and of its extensions, and change nothing.')
parser.add_argument('-a', '--add-users',
                    action='store_true',
                    default=False,
                    help='Add the default accounts, one per user group. An account that is already there is left as it is.')
parser.add_argument('-c', '--cancel-users',
                    action='store_true',
                    default=False,
                    help='Delete the default accounts.')
ARGEOF
