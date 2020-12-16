import { events, StatusBarItem, window, workspace } from 'coc.nvim'
'use strict'

let statusItem: StatusBarItem = window.createStatusBarItem(100)
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
  statusItem.isProgress = false
  statusItem.text = message || ''
}
