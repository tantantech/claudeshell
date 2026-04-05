import { plugin as git } from './git.js'
import { plugin as gitCompletions } from './completions/git-completions.js'
import { plugin as dockerCompletions } from './completions/docker-completions.js'
import { plugin as npmCompletions } from './completions/npm-completions.js'
import { plugin as kubectlCompletions } from './completions/kubectl-completions.js'
import { plugin as cloudCompletions } from './completions/cloud-completions.js'
import { plugin as devtoolsCompletions } from './completions/devtools-completions.js'
import { plugin as sysadminCompletions } from './completions/sysadmin-completions.js'
import { plugin as extract } from './utilities/extract.js'
import { plugin as sudo } from './utilities/sudo.js'
import { plugin as copypath } from './utilities/copypath.js'
import { plugin as encode64 } from './utilities/encode64.js'
import { plugin as urltools } from './utilities/urltools.js'
import { plugin as jsontools } from './utilities/jsontools.js'
import { plugin as webSearch } from './utilities/web-search.js'
import { plugin as dirhistory } from './utilities/dirhistory.js'
import type { PluginManifest } from './types.js'

export const BUNDLED_PLUGINS: readonly PluginManifest[] = [
  // Alias plugin
  git,
  // Completion plugins
  gitCompletions,
  dockerCompletions,
  npmCompletions,
  kubectlCompletions,
  cloudCompletions,
  devtoolsCompletions,
  sysadminCompletions,
  // Utility plugins
  extract,
  sudo,
  copypath,
  encode64,
  urltools,
  jsontools,
  webSearch,
  dirhistory,
]
