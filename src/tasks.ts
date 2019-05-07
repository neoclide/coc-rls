// Copyright 2017 The RLS Developers. See the COPYRIGHT
// file at the top-level directory of this distribution and at
// http://rust-lang.org/COPYRIGHT.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

import { workspace } from 'coc.nvim'

export interface Cmd {
  command: string
  args: string[]
  env?: { [key: string]: string }
}

export function runCommand(cwd: string, command: Cmd): void {
  let cmd = `${command.command} ${command.args.join(' ')}`
  workspace.runTerminalCommand(cmd, cwd).catch(e => {
    // tslint:disable-next-line: no-console
    console.error(e)
  })
}
