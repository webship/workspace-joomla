/**
 * Joomla for Webship Workspace: a platform plugin.
 *
 * What the package carries is placed by the installer from the manifest: the builder and the
 * Joomla CLI tool in the sites folders, their functions and argparse under core/scripts/plugins/joomla/,
 * the agents in the AI Agents folder. The dashboard needs nothing drawn for it: the builder is in the
 * Build list because it is a cmd-*-project.sh, the row menus are the core's, the agents are listed
 * like any other. What register() adds is what the assistant is told.
 *
 * Everything the dashboard is asked for goes through `api`; this package requires nothing from the
 * dashboard's own files, so it can be installed from npm and removed without a trace.
 */

import type { PluginApi } from '@webship.co/workspace-plugin-api';

/** The plugin's name, which its functions and its user list are named after. */
export const PLATFORM = 'joomla';

/** The commands the installer places in every sites folder. */
export const COMMANDS = ['cmd-joomla-project.sh', 'cmd-tools-joomla-cli.sh'];

/** The agents the installer places in the AI Agents folder. */
export const AGENTS = ['joomla-site-builder', 'joomla-tester'];

/** What the assistant is told about Joomla in this workspace. */
export function assistantContext(): string {
  return [
    'Joomla (a plugin, @webship.co/workspace-joomla): a Joomla site is built with',
    '`bash cmd-joomla-project.sh <name> --install --add-users` from a sites folder (dev, test, sandboxes, demos),',
    'in a container like every other project, at https://<name>.ddev.site (the administrator at /administrator).',
    '`bash cmd-tools-joomla-cli.sh <name>` says what the site is; `--run "<command>"` runs the Joomla CLI (cli/joomla.php) in it,',
    '`--update` updates the core, `--check` looks for updates, `--add-users` adds the default accounts (one per user group).',
    '`bash cmd-tools-add-users.sh <name> joomla` adds the same accounts.',
    '`bash cmd-tools-testing.sh <name>` sets up webship-js with the Joomla step pack; `--run` runs the suite.',
    `For Joomla work, hand over to the agents ${AGENTS.map((a) => `\`${a}\``).join(' and ')}.`,
    'Never run php, composer, npm or mysql on the host for a project.',
  ].join(' ');
}

export function register(api: PluginApi): void {
  api.addAssistantContext(assistantContext);
}
