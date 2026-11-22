# @webship.co/workspace-joomla

Joomla for the [Webship Workspace](https://github.com/webship/workspace) dashboard: a builder
that makes a real Joomla site in a container, a Joomla CLI tool for the sites it built, the default
accounts, the [Joomla step pack](https://github.com/webship/joomla-steps) wired into the
workspace's testing setup, and its AI items — two agents, a skill, a command and a prompt —
each listed in the workspace folder of its kind.

The workspace is container-based (DDEV by default): a Joomla project is a row like any other, so
the row menus the core draws (start, stop, launch, backup, clone, remove, tests) work on it unchanged.
A site is also built on Docker Compose or on a Kubernetes cluster: see [Runtimes](#runtimes).

It is made from the reference platform plugin,
[`@webship.co/workspace-wordpress`](https://github.com/webship/workspace-wordpress).

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require github:webship/workspace-joomla   # npm install into the dashboard
bash core/scripts/plugins.sh --activate joomla                            # plugins.joomla in settings.yml
bash core/scripts/plugins.sh --install joomla                             # commands, functions, args, AI items
bash core/scripts/plugins.sh --configure joomla                           # nothing to configure: it has no settings file
```

The same four steps are buttons on the dashboard's **Settings → Plugins** page. `--install` is
idempotent. `--uninstall` removes what it placed; an AI item you edited stays.

Everything the plugin carries lands in the folder it belongs to, when that folder is an active
workspace folder:

| What | Lands in |
| --- | --- |
| `cmd-joomla-project.sh`, `cmd-tools-joomla-cli.sh` | every active sites folder: `dev/`, `test/`, `sandboxes/`, `demos/` |
| The agents `joomla-site-builder`, `joomla-tester` | `ai-agents/` |
| The skill `joomla-scenarios` | `ai-skills/` |
| The command `/joomla-test` | `ai-commands/` |
| The prompt `joomla-build-and-test` | `ai-prompts/` |

There they are listed like any other item of the folder, and installed into Claude Code from there.

It needs a Webship Workspace 1.0.7 or later.

## What it needs

A workspace starts empty, so the manifest says what else this plugin needs (`needs`):

- one sites folder, for the builder and the tool: `dev`, `test`, `sandboxes`, `demos` (`dev` is the one added when none is there). The folder also carries `cmd-tools-testing.sh` and the Users tools this plugin's hooks answer to.
- `ai-agents`, `ai-skills`, `ai-commands` and `ai-prompts`: the AI folders its agents, its skill, its command and its prompt are placed in.

`--require` says so, `--activate` and `--install` stop until the workspace has them, and `--with-needs` adds what is missing first:

```bash
bash core/scripts/plugins.sh --activate joomla --with-needs   # dev and the four AI folders are required, activated and installed first
bash core/scripts/plugins.sh --install joomla
```

Everything the builder runs for a site runs in the site's own container, through the container tool the workspace already needs; the plugin asks for no command of its own on the machine.

A workspace that knows none of this (Webship Workspace 1.0.8 and older) ignores the keys: add a sites folder and the AI folders yourself, then `--install joomla` again. A kind whose folder is not there is skipped, and the install says so.

## What the package holds

| Path | What it is |
| --- | --- |
| `commands/cmd-joomla-project.sh` | The builder, in the Build list as **Joomla (latest)**, installed into every sites folder |
| `commands/cmd-tools-joomla-cli.sh` | The Joomla CLI for one project: what the site is, a command, updates, the default accounts |
| `scripts/functions/fun-joomla.sh` | The bash functions behind both, sourced by bootstrap once installed; the names the core's tools look for (`set_joomla_users`, `add_joomla_users`, `cancel_joomla_users`, `testing_configure_joomla`) |
| `scripts/args/arg-joomla.sh`, `arg-joomla-cli.sh` | Their argparse; the Build form draws the builder's flags from the first |
| `testing/site.feature` | The first feature a Joomla project gets when testing is set up |
| `ai/agents/joomla-site-builder.md` | The agent that builds and maintains Joomla sites with these commands |
| `ai/agents/joomla-tester.md` | The agent that writes and runs scenarios with the Joomla step pack |
| `ai/skills/joomla-scenarios/` | The skill: the step pack's phrases by area, the traps found on a real site, three example features |
| `ai/commands/joomla-test.md` | The slash command `/joomla-test <site>`: set up, match every step, run, report |
| `ai/prompts/joomla-build-and-test.md` | The prompt: a whole launch command for a new session |
| `docs/plugin-items-pattern.md` | How a plugin carries its own commands and AI items, and how to prove it |
| `src/index.ts` | `register(api)`: what the assistant is told about Joomla here |
| `features/joomla.feature` | Scenarios for the dashboard's own browser suite |
| `features/joomla-runtimes.feature` | The row, the test users and the pages of a Joomla site built on Docker Compose and on Kubernetes |

The `workspacePlugin` block in `package.json` is the manifest the installer reads.

## The commands

Run them from a sites folder. `--help` is safe on both.

### Build a site

```bash
cd ~/workspace/dev
bash cmd-joomla-project.sh mysite --install --add-users
```

| Flag | What it does |
| --- | --- |
| `--version <x>` | The release to download: `latest` (the default: the latest stable release), or a number such as `6.2.0` |
| `--install` | Install the site, with the workspace account as its Super User |
| `--add-users` | With `--install`: add the default accounts, one per user group |
| `--sample-data` | With `--install`: add the blog sample data of Joomla, and build the Smart Search index over it |
| `--php-version <x>` | The PHP of the project container (`8.3`) |
| `--runtime <name>` | The container runtime to build on: `ddev` (the default), `docker`, `kubernetes` or `podman`. See [Runtimes](#runtimes) |
| `--launch` | Open the site when it is ready |

On DDEV the site answers at `https://mysite.ddev.site`, the administrator at `/administrator`. The container
tool has no project type for Joomla, so the build runs `ddev config --project-type=php` with the
docroot `public` and the Node.js of the workspace (24), downloads the full package of the release
and unpacks it in the container, and installs with Joomla's own command-line installer. The
installer is given the container's database values (`db` / `db` / `db`), the same in every project,
and nothing personal. A project of the same name is deleted first.

Joomla refuses a password shorter than 12 characters: `--install` stops before it starts when the
workspace account's is shorter.

### Runtimes

```bash
bash cmd-joomla-project.sh mysite --install --add-users                        # DDEV, the default
bash cmd-joomla-project.sh mysite --install --add-users --runtime docker       # Docker Compose
bash cmd-joomla-project.sh mysite --install --add-users --runtime kubernetes   # a Kubernetes cluster
```

Without `--runtime` a build takes `container.runtime` of the workspace's `settings.yml`, then DDEV.
It needs a Webship Workspace with the container runtimes
([webship/workspace#694](https://github.com/webship/workspace/issues/694)); on an older one the
builder refuses `--runtime` and builds on DDEV only.

| | DDEV | Docker Compose | Kubernetes | Podman |
| --- | --- | --- | --- | --- |
| Build and install, with the default accounts and the sample data | Yes | Yes | The same code as Docker Compose, not yet run | The same code as Docker Compose, not yet run |
| The front page and the administrator | Yes | Yes | The same code as Docker Compose, not yet run | Not yet run |
| `cmd-tools-joomla-cli.sh`: what the site is, `--run`, `--check` | Yes | Yes | The same code as Docker Compose, not yet run | Not yet run |
| Test users, added and cancelled | Yes | Yes | The same code as Docker Compose, not yet run | Not yet run |
| The testing setup and the suite (`cmd-tools-testing.sh`, `--run`) | Yes | Yes | The same code as Docker Compose, not yet run | Not yet run |
| Mail caught by Mailpit | Yes | Yes | The same code as Docker Compose, not yet run | Not yet run |
| Export and import the database | Yes | Yes | The same code as Docker Compose, not yet run | Not yet run |
| The row in the dashboard, and remove | Yes | Yes | The same code as Docker Compose, not yet run | Not yet run |

"Yes" means it was run on a real site of that runtime.

| Runtime | The site's address | What the project carries |
| --- | --- | --- |
| DDEV | `https://mysite.ddev.site` | `.ddev/config.yaml`, the project type `php` |
| Docker Compose | `http://127.0.0.1:<port>`, printed by the build | `compose.yaml`, `.webship/runtime/Dockerfile` |
| Kubernetes | `http://<node address>:<port>`, printed by the build | The same, and `k8s/` (the namespace `ws-mysite`) |

What differs on Docker Compose and Kubernetes:

- **The claim:** the project type is `php` there too, so the builder writes `platform: joomla` in the
  `x-webship:` block of `compose.yaml`. That is how the tools know a Joomla project there, and why
  the row's Tests menu offers **Add the test users** and **Cancel the test users**.
- **The web server** is Apache, so the builder copies the release's `htaccess.txt` to `.htaccess`,
  as Joomla asks for on Apache. A `.htaccess` that is already there is kept. On DDEV it writes none.
- **The database** needs nothing new: the installer is given `db` / `db` / `db` on the host `db`,
  which the stack of every runtime has.
- **The address:** Joomla keeps none, so the same site answers on its port, on the node of a
  cluster and through a tunnel.
- **The suite** runs in the Workspace's tests container, against the site's address.
- **Not there yet:** captured mail has no page in a browser (Mailpit is reached from the web
  container). HTTPS and a host name are DDEV's. Podman runs the same code as Docker Compose and was
  not run yet.

The same commands work on every runtime: `cmd-tools-joomla-cli.sh`, `cmd-tools-add-users.sh`,
`cmd-tools-testing.sh`. The pattern is the reference plugin's:
[On Docker Compose and Kubernetes](https://github.com/webship/workspace-wordpress/blob/1.0.x/docs/cms-plugin-pattern.md#on-docker-compose-and-kubernetes).

### Work on a site

```bash
bash cmd-tools-joomla-cli.sh mysite                                    # version, address, accounts
bash cmd-tools-joomla-cli.sh mysite --run "extension:list --type=plugin"
bash cmd-tools-joomla-cli.sh mysite --run "list"                       # every command of the Joomla CLI
bash cmd-tools-joomla-cli.sh mysite --check                            # look for updates of the core and the extensions
bash cmd-tools-joomla-cli.sh mysite --update                           # update the core, clean the cache
bash cmd-tools-joomla-cli.sh mysite --add-users                        # the default accounts
bash cmd-tools-joomla-cli.sh mysite --cancel-users                     # delete them
```

### The default accounts

| Account | User group | Handle in the tests | Logs in to |
| --- | --- | --- | --- |
| `administrator` | Super Users | `admin` | the administrator and the site |
| `manager` | Manager | `manager` | the administrator and the site |
| `editor` | Editor | `editor` | the site |
| `member` | Registered | `member` | the site |

Each has the address `<account>@example.com` and the password of the workspace's other default
lists. They are for local sites and for tests; the site's own Super User is the workspace
account and is never written into a test. `bash cmd-tools-add-users.sh mysite joomla` and
`bash cmd-tools-cancel-users.sh mysite joomla` add and remove the same list.

On DDEV the **Users** menu of a project row does not add them: the dashboard reads the user list of
a row from the DDEV project type, and a Joomla project is a `php` project, because the container
tool has no type for Joomla. Use the CLI tool or the two commands above. On Docker Compose and
Kubernetes the builder claims the project for the plugin, so the row's Tests menu adds and cancels
them.

### Test a site

```bash
bash cmd-tools-testing.sh mysite                 # webship-js, the step pack, the users registry, a first feature
bash cmd-tools-testing.sh mysite --run           # run the suite in the container
bash cmd-tools-testing.sh mysite --run --path tests/features/site.feature
```

`cmd-tools-testing.sh` is the workspace's own. For a Joomla project it also adds
`@webship-js/joomla-steps` to `package.json`, lists its step definitions in `cucumber.js` after
webship-js's own, writes the users registry (the handles above, overridable with
`JOOMLA_<HANDLE>_USER` and `JOOMLA_<HANDLE>_PASSWORD`), places `tests/features/site.feature` when the
project has none, and makes sure the default accounts are on the site. Run it again and it adds what
is missing and keeps what you changed.

## The AI items

`ai/` in the package holds one folder per kind, the manifest's `ai` block names each item, and
`--install` places it in the workspace folder of that kind.

| Kind | Item | Use it to |
| --- | --- | --- |
| Agent | `joomla-site-builder` | Build, update, maintain or remove a Joomla site with the commands above, in containers only |
| Agent | `joomla-tester` | Set the testing stack up, look at the site in the Playwright MCP browser first, write scenarios from the pack's steps and run them; it never creates an account in a suite and never writes a platform name into a step phrase |
| Skill | `joomla-scenarios` | Write a scenario from phrases that exist: the pack's steps by area (the administrator, lists and content, users and groups, the public site, search), the handles of the users registry, the traps found on a real site, and three features that pass on a fresh site |
| Command | `/joomla-test <site> [feature or @tag]` | Run the suite of a site from inside a session: set up when missing, match every step, run, report what failed and why |
| Prompt | `joomla-build-and-test` | Start a session that builds a site with the sample data, says what it is, sets the testing stack up and runs the first feature |

After `--install` each is in its folder on the dashboard. **Install** there puts an agent, a skill
or a command into Claude Code (`~/.claude/agents`, `~/.claude/skills`, `~/.claude/commands`), or
from the command line:

```bash
cd ~/workspace/ai-agents   && bash cmd-tools-ai-items.sh joomla-tester --install
cd ~/workspace/ai-skills   && bash cmd-tools-ai-items.sh joomla-scenarios --install
cd ~/workspace/ai-commands && bash cmd-tools-ai-items.sh joomla-test --install
```

A prompt is not installed: it is the whole `claude …` launch command of a new session, and the
dashboard's **New screen** form lists it as a template. By hand, fill the placeholders in and run
the command of the file from the folder it names.

The items are written for any AI CLI, with Claude Code as the default shape: the frontmatter and
the file layout are Claude Code's, the body of each item is plain Markdown that names no tool or
feature of one CLI, a command says in words what its arguments are, and the text between the
triple quotes of a prompt can be given to another AI CLI as it is.

Every step phrase the items show is checked against the definitions of the step pack and of
webship-js (`tests/fixtures/step-definitions.txt`), and every command and flag against the
plugin's own. The shape is the reference's: [`docs/plugin-items-pattern.md`](docs/plugin-items-pattern.md).

## Develop it

```bash
npm install     # builds dist/ (TypeScript)
npm run lint
npm test        # the manifest, the commands, the AI items, the functions against a scaffolded project
```
