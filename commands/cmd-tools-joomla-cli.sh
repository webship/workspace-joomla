#!/usr/bin/env bash

# Installed by the Joomla plugin (plugins.sh --install joomla); __WORKSPACE__ is the workspace it was installed into.
#
# The Joomla CLI (cli/joomla.php) for one Joomla project of this workspace, in its container: say
# what the site is, run a CLI command, update the core, look for updates, add or remove the default
# accounts. Nothing here runs on the host.

# Bootstrap.
# Find the workspace tooling from this script, so a fresh clone needs no setup.
WORKSPACE_SCRIPTS="${WORKSPACE_SCRIPTS:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../core/scripts" && pwd)}";
source ${WORKSPACE_SCRIPTS}/bootstrap.sh || exit 1 ;

# Load workspace settings.
eval $(parse_yaml ${WORKSPACE_CONFIG}/workspace.__WORKSPACE__.settings.yml);

# Distribution.
distribution_name="joomla";

ARGPARSE_DESCRIPTION="Run the Joomla CLI on a Joomla project of __WORKSPACE__: status, a command, updates, the default accounts"
# The args file comes with the plugin: core/scripts/plugins/joomla/ is where plugins.sh --install puts it.
source ${WORKSPACE_SCRIPTS}/plugins/joomla/args/arg-joomla-cli.sh || exit 1 ;

shift $#;

joomla_cli_tool ;
