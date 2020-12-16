import { window } from 'coc.nvim'

export interface Cmd {
  command: string
  args: string[]
  env?: { [key: string]: string }
}

export function runCommand(cwd: string, command: Cmd): void {
  let cmd = `${command.command} ${command.args.join(' ')}`
  window.runTerminalCommand(cmd, cwd).catch(e => {
    // tslint:disable-next-line: no-console
    console.error(e)
  })
}
