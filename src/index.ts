'use strict'
import * as child_process from 'child_process'
import { commands, Terminal, ExtensionContext, LanguageClient, LanguageClientOptions, ServerOptions, services, Uri, workspace } from 'coc.nvim'
import * as fs from 'fs'
import path from 'path'
import { NotificationType, WorkspaceFolder } from 'vscode-languageserver-protocol'
import { RLSConfiguration } from './configuration'
import { runRlsViaRustup, rustupUpdate } from './rustup'
import { startSpinner, stopSpinner } from './spinner'
import { ExecChildProcessResult, execFile } from './utils/child_process'

let client: ClientWorkspace

export async function activate(context: ExtensionContext) {
  let folder = workspace.rootPath
  warnOnMissingCargoToml(folder)

  client = new ClientWorkspace({
    uri: Uri.file(folder).toString(),
    name: path.basename(folder)
  })
  client.start(context).catch(_e => {
    // noop
  })
}

export async function deactivate(): Promise<void> {
  await client.stop()
}

// We run one RLS and one corresponding language client per workspace folder
// (VSCode workspace, not Cargo workspace). This class contains all the per-client
// and per-workspace stuff.
class ClientWorkspace {
  // FIXME(#233): Don't only rely on lazily initializing it once on startup,
  // handle possible `rust-client.*` value changes while extension is running
  public readonly config: RLSConfiguration
  public lc: LanguageClient | null = null
  public readonly folder: WorkspaceFolder

  constructor(folder: WorkspaceFolder) {
    this.config = RLSConfiguration.loadFromWorkspace(Uri.parse(folder.uri).fsPath)
    this.folder = folder
  }

  async start(context: ExtensionContext) {
    // These methods cannot throw an error, so we can drop it.

    startSpinner('RLS', 'Starting')

    this.warnOnRlsToml()
    // Check for deprecated env vars.
    if (process.env.RLS_PATH || process.env.RLS_ROOT) {
      workspace.showMessage(
        'Found deprecated environment variables (RLS_PATH or RLS_ROOT). Use `rls.path` or `rls.root` settings.', 'warning'
      )
    }

    const serverOptions: ServerOptions = async () => {
      await this.autoUpdate()
      return this.makeRlsProcess()
    }
    const clientOptions: LanguageClientOptions = {
      // Register the server for Rust files
      documentSelector: [
        { language: 'rust', scheme: 'file' },
        { language: 'rust', scheme: 'untitled' }
      ],
      diagnosticCollectionName: 'rust',
      synchronize: { configurationSection: 'rust' },
      // Controls when to focus the channel rather than when to reveal it in the drop-down list
      revealOutputChannelOn: this.config.revealOutputChannelOn,
      initializationOptions: {
        omitInitBuild: true,
        cmdRun: true,
      },
      workspaceFolder: this.folder,
    }

    // Create the language client and start the client.
    this.lc = new LanguageClient('rust-client', 'Rust Language Server', serverOptions, clientOptions)

    const promise = this.progressCounter()

    const disposable = this.lc.start()
    context.subscriptions.push(disposable)
    context.subscriptions.push(services.registLanguageClient(this.lc))

    this.registerCommands(context)

    return promise
  }

  registerCommands(context: ExtensionContext) {
    if (!this.lc) {
      return
    }

    const rustupUpdateDisposable = commands.registerCommand('rls.update', () => {
      return rustupUpdate(this.config.rustupConfig())
    })
    context.subscriptions.push(rustupUpdateDisposable)

    const restartServer = commands.registerCommand('rls.restart', async () => {
      if (this.lc) {
        await this.lc.stop()
      }
      return this.start(context)
    })
    context.subscriptions.push(restartServer)

    let terminal: Terminal
    context.subscriptions.push(
      commands.registerCommand('rls.run', async () => {
        if (terminal) terminal.dispose()
        terminal = await workspace.createTerminal({
          name: 'cargo run',
          cwd: workspace.rootPath,
          env: process.env
        })
        await terminal.show(true)
        terminal.sendText('cargo run')
      })
    )
  }

  async progressCounter() {
    if (!this.lc) {
      return
    }

    const runningProgress: Set<string> = new Set()
    const asPercent = (fraction: number): string => `${Math.round(fraction * 100)}%`
    let runningDiagnostics = 0
    await this.lc.onReady()
    stopSpinner('RLS')

    this.lc.onNotification(new NotificationType('window/progress'), function(progress: any) {
      if (progress.done) {
        runningProgress.delete(progress.id)
      } else {
        runningProgress.add(progress.id)
      }
      if (runningProgress.size) {
        let status = ''
        if (typeof progress.percentage === 'number') {
          status = asPercent(progress.percentage)
        } else if (progress.message) {
          status = progress.message
        } else if (progress.title) {
          status = `[${progress.title.toLowerCase()}]`
        }
        startSpinner('RLS', status)
      } else {
        stopSpinner('RLS')
      }
    })

    // FIXME these are legacy notifications used by RLS ca jan 2018.
    // remove once we're certain we've progress on.
    this.lc.onNotification(new NotificationType('rustDocument/beginBuild'), function(_f: any) {
      runningDiagnostics++
      startSpinner('RLS', 'working')
    })
    this.lc.onNotification(new NotificationType('rustDocument/diagnosticsEnd'), function(_f: any) {
      runningDiagnostics--
      if (runningDiagnostics <= 0) {
        stopSpinner('RLS')
      }
    })
  }

  async stop() {
    let promise: Thenable<void> = Promise.resolve(void 0)
    if (this.lc) {
      promise = this.lc.stop()
    }
    return promise.then(() => {
    })
  }

  public async getSysroot(env: Object): Promise<string> {
    let output: ExecChildProcessResult
    try {
      if (this.config.rustupDisabled) {
        output = await execFile(
          'rustc', ['--print', 'sysroot'], { env } as any
        )
      } else {
        output = await execFile(
          this.config.rustupPath, ['run', this.config.channel, 'rustc', '--print', 'sysroot'], { env } as any
        )
      }
    } catch (e) {
      throw new Error(`Error getting sysroot from \`rustc\`: ${e}`)
    }

    if (!output.stdout) {
      throw new Error(`Couldn't get sysroot from \`rustc\`: Got no ouput`)
    }

    return output.stdout.replace('\n', '').replace('\r', '')
  }

  // Make an evironment to run the RLS.
  public async makeRlsEnv(setLibPath = false): Promise<any> {
    const env = process.env

    let sysroot: string | undefined
    try {
      sysroot = await this.getSysroot(env)
    } catch (err) {
      workspace.showMessage(err.message)
      workspace.showMessage(`Let's retry with extended $PATH`)
      env.PATH = `${env.HOME || '~'}/.cargo/bin:${env.PATH || ''}`
      try {
        sysroot = await this.getSysroot(env)
      } catch (e) {
        // tslint:disable-next-line: no-console
        console.error('Error reading sysroot (second try)', e)
        workspace.showMessage(`Error reading sysroot: ${e.message}`, 'warning')
        return env
      }
    }

    workspace.showMessage(`Setting sysroot to` + sysroot)
    if (setLibPath) {
      function appendEnv(envVar: string, newComponent: string) {
        const old = process.env[envVar]
        return old ? `${newComponent}:${old}` : newComponent
      }
      env.DYLD_LIBRARY_PATH = appendEnv('DYLD_LIBRARY_PATH', sysroot + '/lib')
      env.LD_LIBRARY_PATH = appendEnv('LD_LIBRARY_PATH', sysroot + '/lib')
    }

    return env
  }

  public async makeRlsProcess(): Promise<child_process.ChildProcess> {
    // Allow to override how RLS is started up.
    const rls_path = this.config.rlsPath

    let childProcessPromise: Promise<child_process.ChildProcess>
    if (rls_path) {
      const env = await this.makeRlsEnv(true)
      workspace.showMessage(`running: ${rls_path} at ${workspace.rootPath}`)
      childProcessPromise = Promise.resolve(child_process.spawn(rls_path, [], { env, cwd: workspace.rootPath }))
    } else if (this.config.rustupDisabled) {
      const env = await this.makeRlsEnv(true)
      workspace.showMessage(`running: rls at ${workspace.rootPath}`)
      childProcessPromise = Promise.resolve(child_process.spawn('rls', [], { env, cwd: workspace.rootPath }))
    } else {
      const env = await this.makeRlsEnv()
      let config = this.config.rustupConfig()
      workspace.showMessage(`running: ${config.path} run ${config.channel} rls, at ${workspace.rootPath}`)
      childProcessPromise = runRlsViaRustup(env, config)
    }
    try {
      const childProcess = await childProcessPromise

      childProcess.on('error', err => {
        if ((err as any).code == 'ENOENT') {
          console.error('Could not spawn RLS process: ', err.message)
          workspace.showMessage('Could not start RLS', 'warning')
        } else {
          throw err
        }
      })

      if (this.config.logToFile) {
        const logPath = workspace.rootPath + '/rls' + Date.now() + '.log'
        const logStream = fs.createWriteStream(logPath, { flags: 'w+' })
        logStream.on('open', function(_f) {
          childProcess.stderr.addListener('data', function(chunk) {
            logStream.write(chunk.toString())
          })
        }).on('error', function(err: any) {
          console.error("Couldn't write to " + logPath + ' (' + err + ')')
          logStream.end()
        })
      }

      return childProcess
    } catch (e) {
      stopSpinner('RLS could not be started')
      throw new Error('Error starting up rls.')
    }
  }

  async autoUpdate() {
    if (this.config.updateOnStartup && !this.config.rustupDisabled) {
      await rustupUpdate(this.config.rustupConfig())
    }
  }

  warnOnRlsToml() {
    const tomlPath = workspace.rootPath + '/rls.toml'
    fs.access(tomlPath, fs.constants.F_OK, err => {
      if (!err) {
        workspace.showMessage(
          `Found deprecated rls.toml. Use Coc user settings instead, run ':CocConfig'`, 'warning'
        )
      }
    })
  }
}

async function warnOnMissingCargoToml(folder: string) {
  if (!fs.existsSync(path.join(folder, 'Cargo.toml'))) {
    workspace.showMessage(
      'A Cargo.toml file must be at the root of the workspace in order to support all features', 'warning'
    )
  }
}
