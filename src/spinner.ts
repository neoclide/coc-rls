// Copyright 2017 The RLS Developers. See the COPYRIGHT
// file at the top-level directory of this distribution and at
// http://rust-lang.org/COPYRIGHT.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

'use strict'

import { workspace, StatusBarItem } from 'coc.nvim'

let statusItem: StatusBarItem = workspace.createStatusBarItem(100)
let spinnerTimer: NodeJS.Timer = null
const spinner = ['◐', '◓', '◑', '◒']

export function startSpinner(prefix: string, postfix: string): void {
  if (spinnerTimer != null) {
    clearInterval(spinnerTimer)
  }
  let state = 0
  statusItem.text = ''
  statusItem.show()
  spinnerTimer = setInterval(() => {
    statusItem.text = prefix + ' ' + spinner[state] + ' ' + postfix
    state = (state + 1) % spinner.length
  }, 100)
}

export function stopSpinner(message: string): void {
  if (spinnerTimer !== null) {
    clearInterval(spinnerTimer)
  }
  spinnerTimer = null
  statusItem.text = message || ''
}
