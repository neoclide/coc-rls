# Rust support for coc.nvim

[![NPM version](https://img.shields.io/npm/v/coc-rls.svg?style=flat-square)](https://www.npmjs.com/package/coc-rls)

It's fork of [rls-vscode](https://github.com/rust-lang-nursery/rls-vscode).

Adds language support for Rust to [coc.nvim](https://github.com/neoclide/coc.nvim). Supports:

- code completion
- jump to definition, peek definition, find all references, symbol search
- types and documentation on hover
- code formatting
- refactoring (rename, deglob)
- error squiggles and apply suggestions from errors
- snippets

Rust support is powered by the [Rust Language Server](https://github.com/rust-lang/rls)
(RLS). If you don't have it installed, the extension will install it for you.

For support, please file an [issue on the repo](https://github.com/neoclide/coc-rls/issues/new)
or talk to us [on Gitter](https://gitter.im/rust-lang/IDEs) or in #rust-dev-tools
on IRC ([Mozilla servers](https://wiki.mozilla.org/IRC)). There is also some
[troubleshooting and debugging](https://github.com/neoclide/coc.nvim/wiki/Debug-language-server) advice.

**Note:** multiple projects is not supported, you have to use different vim
instances.

## Quick start

- Install [rustup](https://www.rustup.rs/) (Rust toolchain manager).
- Install this extension in your vim by:

  ```vim
  :CocInstall coc-rls
  ```

- (Skip this step if you already have Rust projects that you'd like to work on.)
  Create a new Rust project by following [these instructions](https://doc.rust-lang.org/book/second-edition/ch01-02-hello-world.html#creating-a-project-with-cargo).
- Open a Rust project. Open the folder for the whole project (i.e., the folder containing 'Cargo.toml'),
  not the 'src' folder.
- You'll be prompted to install the RLS. Once installed, the RLS should start
  building your project.

## Nixos

Nixos users should use nix-shell or direnv for development. Follow [these instructions](https://nixos.wiki/wiki/Development_environment_with_nix-shell) to set them up first.

Then create two files:

1. An **.envrc** file containing `use_nix`.
2. And **shell.nix** containing:

```
let
  moz_overlay = import (builtins.fetchTarball https://github.com/mozilla/nixpkgs-mozilla/archive/master.tar.gz);
  nixpkgs = import <nixpkgs> { overlays = [ moz_overlay ]; };
  #rustNightlyChannel = (nixpkgs.rustChannelOf { date = "2019-01-26"; channel = "nightly"; }).rust;
  rustStableChannel = nixpkgs.latest.rustChannels.stable.rust.override {
    extensions = [
      "rust-src"
      "rls-preview"
      "clippy-preview"
      "rustfmt-preview"
    ];
  };
in
  with nixpkgs;
  stdenv.mkDerivation {
    name = "moz_overlay_shell";
    buildInputs = [
      rustStableChannel
      rls
      rustup
    ];
  }
```

Enter the shell in current directory and enjoy developing rust apps + coc.nvim + coc-rls :)

Tip: If you want to use nightly channel uncomment that line and use it :)

## Configuration

This extension provides some options into `coc-settings.json`. These
options have names which start with `rust.`. Install [coc-json](https://github.com/neoclide/coc-json)
for auto completion support.

- `rust-client.logToFile` - When set to true, RLS stderr is logged to a file at workspace root level.
- `rust-client.rustupPath` - Path to rustup executable, default `rustup`.
- `rust-client.rlsPath` - Path to rls executable (only required for rls developers), default: `null`.
- `rust-client.revealOutputChannelOn` - Specifies message severity on which the output channel will be revealed.
- `rust-client.updateOnStartup` - Update the RLS whenever the extension starts up, default: `false`.
- `rust-client.disableRustup` - Disable usage of rustup and use rustc/rls from PATH.
- `rust-client.channel` - Rust channel to install RLS from. By default it will use the same channel as your currently open project
  `rls-preview`
- `rust.show_warnings` - set to false to silence warnings in the editor.
- `rust.all_targets` - build and index code for all targets (i.e., integration tests, examples, and benches)
- `rust.build_lib` - if you have both a binary and library in your crate, set to
  true to build only the library.
- `rust.build_bin` - if you have multiple binaries, you can specify which to build
  using this option.
- `rust.cfg_test` - build and index test code (i.e., code with `#[cfg(test)]`/`#[test]`)

## Features

### Snippets

Snippets are code templates which expand into common boilerplate. Intellisense
includes snippet names as options when you type; select one by confirm the
completion.
You can move to the next 'hole' in the template by pressing '<C-j>' (by default).
We provide the following snippets:

- `for` - a for loop
- `unimplemented`
- `unreachable`
- `println`
- `assert` and `assert_eq`
- `macro_rules` - declare a macro
- `if let Option` - an `if let` statement for executing code only in the `Some`
  case.
- `spawn` - spawn a thread
- `extern crate` - insert an `extern crate` statement

This extension is deliberately conservative about snippets and doesn't include
too many. If you want more, check out
[Trusty Rusty Snippets](https://marketplace.visualstudio.com/items?itemName=polypus74.trusty-rusty-snippets).

## Format on save

To enable formatting on save, open `coc-settings.json` by `:CocConfig`, then add
`"rust"` to `coc.preferences.formatOnSaveFiletypes` field.

## Requirements

- Unless you have `"rust-client.disableRustup": true`, install
  [Rustup](https://www.rustup.rs/) required.
- A Rust toolchain (the extension will configure this for you, with
  permission),
- RLS (currently `rls-preview`), `rust-src`, and `rust-analysis` components (the
  extension will install these for you, with permission).

## Implementation

This extension almost exclusively uses the RLS for its feature support (snippets
are provided client-side). The RLS uses the Rust compiler (rustc) to get data
about Rust programs. It uses Cargo to manage building. Both Cargo and rustc are
run in-process by the RLS. Formatting and code completion are provided by
rustfmt and Racer, again both of these are run in-process by the RLS.

## LICENSE

MIT
