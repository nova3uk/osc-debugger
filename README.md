# osc-debugger

![Example of using osc-debugger](example.gif)

`osc-debugger` is a – 🥁 – OSC debugger for the terminal. This is a **fork** of the original [osc-debugger](https://github.com/alexanderwallin/osc-debugger) by Alexander Wallin, with significant improvements and modernization.

## What's New in This Fork

This fork includes several important improvements over the original:

### Bug Fixes
- **Fixed null value crash**: Monitor mode now properly handles OSC messages with null values without crashing
- **Fixed command-line parsing**: Now supports `address:port` format (e.g., `osc-debugger monitor 127.0.0.1:9000`)

### Major Improvements
- **Converted to TypeScript**: Full type safety and better code maintainability
- **Enhanced error handling**: Better validation and user-friendly error messages
- **Improved user experience**: 
  - More informative status messages with version info
  - Better formatted output with clear separators
  - Enhanced input validation for ports and IP addresses
- **Modernized dependencies**: Updated all packages to latest versions
- **Removed unnecessary dependencies**: Cleaned up unused packages (removed Airbnb ESLint config, yargonaut, etc.)

### Technical Changes
- **Node.js requirement**: Updated to Node.js >= 18.x (from >= 8.x)
- **Build system**: Replaced Babel with TypeScript compiler
- **Module system**: Full ES modules support
- **Code quality**: Added strict TypeScript checks and modern ESLint configuration

## Features

It has two dazzlingly simple features:

* **Monitor OSC messages** (over UDP) sent to a port
* **Send OSC messages** (over UDP) to a port

## Installation

### Global Installation

This thingamajiggy is meant to live globally and happily in your terminal environment. So I would suggest you

```sh
npm i -g osc-debugger
```

with that shiny `-g` flag.

### Local Development

For local development and testing:

```sh
# Clone the repository
git clone <your-repo-url>
cd osc-debugger

# Install dependencies
npm install

# Build the project
npm run build

# Link it globally for testing
npm link

# Or run in development mode
npm run dev
```

## Usage

🎶 _Try with a little `osc-debugger --help` from my friends._ 🎶

### Interactive mode

If you were brave enough to install `osc-debugger` onto your system, then you are free to

```sh
osc-debugger
```

in your terminal. From there you will be escorted to your destination.

### CLI commands

If you know where you are going and don't need that escort, you can

```sh
# Monitor mode - using address:port format (NEW!)
osc-debugger monitor 127.0.0.1:9000

# Monitor mode - just port (defaults to 0.0.0.0)
osc-debugger monitor 9000

# Monitor mode - using flags
osc-debugger monitor -p 6666 -a 127.0.0.1

# Send mode
osc-debugger send -p 6666 -a 192.168.0.1
```

### New Features

**Address:Port Format**: You can now specify the address and port together:
```sh
osc-debugger monitor 127.0.0.1:9000
```

**Better Status Messages**: When starting monitor or send mode, you'll see:
- Version information
- Clear connection details
- Helpful instructions
- Professional formatting

## Development

```sh
# Build TypeScript
npm run build

# Run in development mode (no build needed)
npm run dev

# Type check without building
npm run type-check

# Lint code
npx eslint src/
```

## License

This project is released under **The Unlicense** - essentially public domain. You are free to use, modify, and distribute this software for any purpose.

Original work by [Alexander Wallin](http://alexanderwallin.com). This fork maintains the same permissive license.

## Credits

- **Original Author**: [Alexander Wallin](http://alexanderwallin.com)
- **Original Repository**: https://github.com/alexanderwallin/osc-debugger
- **License**: The Unlicense (public domain)
