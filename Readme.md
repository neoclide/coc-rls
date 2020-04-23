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

## NixOS

NixOS users should use nix-shell or direnv for development. Follow [these instructions](https://nixos.wiki/wiki/Development_environment_with_nix-shell) to set them up first.

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

- `"rust-client.logToFile"`:

  When set to true, RLS stderr is logged to a file at workspace root level. Requires reloading extension after change., default: `false`

- `"rust-client.setLibPath"`

  When set to false, environment variable DYLD_LIBRARY_PATH & LD_LIBRARY_PATH are kept for rls, default: `true`

- `"rust-client.rustupPath"`:

  Path to rustup executable. Ignored if rustup is disabled., default: `"rustup"`

- `"rust-client.rlsPath"`:

  Override RLS path. Only required for RLS developers. If you set this and use rustup, you should also set `rust-client.channel` to ensure your RLS sees the right libraries. If you don't use rustup, make sure to set `rust-client.disableRustup`., default: `null`

- `"rust-client.revealOutputChannelOn"`:

  Specifies message severity on which the output channel will be revealed. Requires reloading extension after change., default: `"never"`

  Valid options: `["info","warn","error","never"]`

- `"rust-client.updateOnStartup"`:

  Update the RLS whenever the extension starts up., default: `false`

- `"rust-client.disableRustup"`:

  Disable usage of rustup and use rustc/rls from PATH., default: `false`

- `"rust-client.channel"`:

  Rust channel to invoke rustup with. Ignored if rustup is disabled. By default, uses the same channel as your currently open project., default: `null`

  Valid options: `["stable","beta","nightly"]`

- `"rust-client.trace.server"`:

  Traces the communication between VS Code and the Rust language server., default: `"off"`

  Valid options: `["off","messages","verbose"]`

- `"rust.sysroot"`:

  `--sysroot`, default: `null`

- `"rust.target"`:

  `--target`, default: `null`

- `"rust.rustflags"`:

  Flags added to `RUSTFLAGS`., default: `null`

- `"rust.clear_env_rust_log"`:

  Clear the `RUST_LOG` environment variable before running rustc or cargo., default: `true`

- `"rust.build_lib"`:

  Specify to run analysis as if running `cargo check --lib`. Use `null` to auto-detect. (unstable), default: `null`

- `"rust.build_bin"`:

  Specify to run analysis as if running `cargo check --bin <name>`. Use `null` to auto-detect. (unstable), default: `null`

- `"rust.cfg_test"`:

  Build cfg(test) code. (unstable), default: `false`

- `"rust.unstable_features"`:

  Enable unstable features., default: `false`

- `"rust.wait_to_build"`:

  Time in milliseconds between receiving a change notification and starting build., default: `1500`

- `"rust.show_warnings"`:

  Show warnings., default: `true`

- `"rust.crate_blacklist"`:

  Overrides the default list of packages for which analysis is skipped.

  Available since RLS 1.38, default: `["cocoa","gleam","glium","idna","libc","openssl","rustc_serialize","serde","serde_json","typenum","unicode_normalization","unicode_segmentation","winapi"]`

- `"rust.build_on_save"`:

  Only index the project when a file is saved and not on change., default: `false`

- `"rust.features"`:

  A list of Cargo features to enable., default: `[]`

- `"rust.all_features"`:

  Enable all Cargo features., default: `false`

- `"rust.no_default_features"`:

  Do not enable default Cargo features., default: `false`

- `"rust.racer_completion"`:

  Enables code completion using racer., default: `true`

- `"rust.clippy_preference"`:

  Controls eagerness of [clippy] diagnostics when available. Valid values are (case-insensitive):

  - `"off"`: Disable clippy lints.
  - `"opt-in"`: Clippy lints are shown when crates specify `#![warn(clippy)]`.
  - `"on"`: Clippy lints enabled for all crates in workspace.
    You need to install clippy via rustup if you haven't already., default: `"opt-in"`

  Valid options: `["on","opt-in","off"]`

- `"rust.jobs"`:

  Number of Cargo jobs to be run in parallel., default: `null`

- `"rust.all_targets"`:

  Checks the project as if you were running cargo check `--all-target`s (I.e., check all targets and integration tests too)., default: `true`

- `"rust.target_dir"`:

  When specified, it places the generated analysis files at the specified target directory. By default it is placed target/rls directory., default: `null`

- `"rust.rustfmt_path"`:

  When specified, RLS will use the Rustfmt pointed at the path instead of the bundled one, default: `null`

- `"rust.build_command"`:

  **EXPERIMENTAL** (requires `unstable_features`)

  If set, executes a given program responsible for rebuilding save-analysis to be loaded by the RLS. The program given should output a list of resulting .json files on stdout.
  Implies `rust.build_on_save`: true., default: `null`

- `"rust.full_docs"`:

  Instructs cargo to enable full documentation extraction during save-analysis while building the crate., default: `null`

- `"rust.show_hover_context"`:

  Show additional context in hover tooltips when available. This is often the type local variable declaration., default: `true`

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

[clippy]: https://github.com/rust-lang/rust-clippy
