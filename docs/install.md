# Install

This is just an example of the ts-starter docs.

Installing `aax` is easy. Simply pull it in via your package manager of choice, or download the binary directly.

## Package Managers

Choose your package manager of choice:

::: code-group

```sh [npm]
npm install --save-dev @stacksjs/aax
# npm i -d @stacksjs/aax

# or, install globally via
npm i -g @stacksjs/aax
```

```sh [bun]
bun install --dev @stacksjs/aax
# bun add --dev @stacksjs/aax
# bun i -d @stacksjs/aax

# or, install globally via
bun add --global @stacksjs/aax
```

```sh [pnpm]
pnpm add --save-dev @stacksjs/aax
# pnpm i -d @stacksjs/aax

# or, install globally via
pnpm add --global @stacksjs/aax
```

```sh [yarn]
yarn add --dev @stacksjs/aax
# yarn i -d @stacksjs/aax

# or, install globally via
yarn global add @stacksjs/aax
```

```sh [brew]
brew install aax # coming soon
```

```sh [pkgx]
pkgx aax # coming soon
```

:::

## Requirements

Before using `aax`, make sure you have:

1. `ffmpeg` installed and available in your PATH
2. `audible-cli` installed and available in your PATH (or in your project root)

### Installing FFmpeg

In case you are not using `pkgx`, you can install FFmpeg using your package manager of choice:

```sh
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows (using Chocolatey)
choco install ffmpeg
```

### Installing Audible CLI

1. Download the appropriate binary from [Audible CLI Releases](https://github.com/mkb79/audible-cli/releases)
2. Place it in your PATH or project root
3. Make it executable: `chmod +x audible`

Read more about how to use it in the Usage section of the documentation.

## Binaries

Choose the binary that matches your platform and architecture:

::: code-group

```sh [macOS (arm64)]
# Download the binary
curl -L https://github.com/stacksjs/aax/releases/download/v0.2.0/aax-darwin-arm64.zip -o aax.zip

# Unzip the file
unzip aax.zip

# Make it executable
chmod +x aax

# Move it to your PATH
mv aax /usr/local/bin/aax
```

```sh [macOS (x64)]
# Download the binary
curl -L https://github.com/stacksjs/aax/releases/download/v0.2.0/aax-darwin-x64.zip -o aax.zip

# Unzip the file
unzip aax.zip

# Make it executable
chmod +x aax

# Move it to your PATH
mv aax /usr/local/bin/aax
```

```sh [Linux (arm64)]
# Download the binary
curl -L https://github.com/stacksjs/aax/releases/download/v0.2.0/aax-linux-arm64.zip -o aax.zip

# Unzip the file
unzip aax.zip

# Make it executable
chmod +x aax

# Move it to your PATH
mv aax /usr/local/bin/aax
```

```sh [Linux (x64)]
# Download the binary
curl -L https://github.com/stacksjs/aax/releases/download/v0.2.0/aax-linux-x64.zip -o aax.zip

# Unzip the file
unzip aax.zip

# Make it executable
chmod +x aax

# Move it to your PATH
mv aax /usr/local/bin/aax
```

```sh [Windows (x64)]
# Download the binary
curl -L https://github.com/stacksjs/aax/releases/download/v0.2.0/aax-windows-x64.zip -o aax.zip

# Unzip the file (using PowerShell)
Expand-Archive -Path aax.zip -DestinationPath .

# Move it to your PATH (adjust the path as needed)
move aax.exe C:\Windows\System32\aax.exe
```

::: tip
You can also find the `aax` binaries in GitHub [releases](https://github.com/stacksjs/aax/releases). Make sure to download the appropriate .zip file for your platform and architecture.
:::

::: warning
If you don't have `unzip` installed on your system, you can install it using your package manager:

```sh
# macOS
brew install unzip

# Ubuntu/Debian
sudo apt install unzip

# Windows
# PowerShell comes with Expand-Archive built-in
```

:::
