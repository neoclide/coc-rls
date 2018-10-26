// Copyright 2017 The RLS Developers. See the COPYRIGHT
// file at the top-level directory of this distribution and at
// http://rust-lang.org/COPYRIGHT.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

import { workspace, TerminalResult } from 'coc.nvim'

export interface Cmd {
  binary: string
  args: string[]
  env: { [key: string]: string }
}

export function runCommand(cwd: string, command: Cmd): Promise<TerminalResult> {
  let cmd = `${command.binary} ${command.args.join(' ')}`
  return workspace.runTerminalCommand(cmd, cwd)
}
