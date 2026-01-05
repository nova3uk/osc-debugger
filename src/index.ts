#!/usr/bin/env node
import inquirer, { Answers } from 'inquirer'
import yargs, { Arguments } from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readFileSync } from 'fs'
const packageInfo = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
)
import monitor from './monitor.js'
import send from './send.js'

enum Task {
  MONITOR = 'MONITOR',
  SEND = 'SEND',
}

interface InteractiveAnswers extends Answers {
  task: Task
  port: number
  address: string
}

interface MonitorArgs {
  target?: string
  port?: string | number
  address?: string
  log?: boolean
  logFile?: string
}

interface SendArgs {
  port: string | number
  address?: string
}

async function runInteractive(): Promise<void> {
  try {
    const { task, port, address }: InteractiveAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'task',
        message: 'What do you want to do?',
        choices: [
          { value: Task.MONITOR, name: 'Monitor OSC messages' },
          { value: Task.SEND, name: 'Send OSC messages' },
        ],
      },
      {
        type: 'input',
        name: 'port',
        message: 'What port do you want to connect to?',
        default: 666,
        filter: (value: string) => {
          const portNum = parseInt(value, 10)
          if (Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
            throw new Error('Port must be a number between 1 and 65535')
          }
          return portNum
        },
        validate: (value: string) => {
          const portNum = parseInt(value, 10)
          if (Number.isNaN(portNum)) {
            return 'Port must be a valid number'
          }
          if (portNum < 1 || portNum > 65535) {
            return 'Port must be between 1 and 65535'
          }
          return true
        },
      },
      {
        type: 'input',
        name: 'address',
        message: 'What host IP do you want to connect to?',
        default: '0.0.0.0',
        validate: (value: string) => {
          if (!value || value.trim() === '') {
            return 'IP address cannot be empty'
          }
          return true
        },
      },
    ])

    if (task === Task.MONITOR) {
      await monitor({ port, address, version: packageInfo.version })
    } else if (task === Task.SEND) {
      await send({ port, address, version: packageInfo.version })
    } else {
      throw new TypeError(`Unknown task: ${task}`)
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`.red)
      if (err.stack) {
        console.error(err.stack)
      }
    } else {
      console.error('An unknown error occurred'.red)
    }
    process.exit(1)
  }
}

function parseAddressPort(
  target: string
): { address: string; port: number } | null {
  const parts = target.split(':')
  if (parts.length === 2) {
    const port = parseInt(parts[1], 10)
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      return null
    }
    return { address: parts[0], port }
  } else if (parts.length === 1) {
    // If only one part, treat it as port
    const port = parseInt(parts[0], 10)
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      return null
    }
    return { address: '0.0.0.0', port }
  }
  return null
}

// Setup CLI
yargs(hideBin(process.argv))
  .scriptName('osc-debugger')
  .usage('')
  .command(
    'monitor [target]',
    'Monitor OSC messages',
    (yargs: any) => {
      return yargs
        .positional('target', {
          type: 'string',
          describe:
            'Address and port in format address:port (e.g., 127.0.0.1:9000)',
        })
        .option('port', {
          alias: 'p',
          type: 'number',
          default: 8888,
          describe: 'The port you want to listen to',
        })
        .option('address', {
          alias: 'a',
          type: 'string',
          default: '0.0.0.0',
          describe: 'The IP address you want to listen on',
        })
        .option('log', {
          alias: 'l',
          type: 'boolean',
          default: false,
          describe: 'Enable logging to file',
        })
        .option('logFile', {
          alias: 'f',
          type: 'string',
          describe:
            'Path to log file (default: osc-monitor-timestamp.log in current directory)',
        })
    },
    async (argv: Arguments<MonitorArgs>) => {
      try {
        let port: number
        let address: string = argv.address || '0.0.0.0'

        // Parse address:port format if provided as positional argument
        if (argv.target) {
          const parsed = parseAddressPort(argv.target)
          if (!parsed) {
            console.error(
              'Invalid address:port format. Use format: address:port or just port'
                .red
            )
            process.exit(1)
          }
          address = parsed.address
          port = parsed.port
        } else {
          // Convert port to number
          port =
            typeof argv.port === 'string'
              ? parseInt(argv.port, 10)
              : (argv.port as number)

          if (Number.isNaN(port) || port < 1 || port > 65535) {
            console.error(
              'Invalid port number. Port must be between 1 and 65535.'.red
            )
            process.exit(1)
          }
        }

        await monitor({
          port,
          address,
          version: packageInfo.version,
          logFile: argv.log ? argv.logFile || '' : null,
        })
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`
            .red
        )
        process.exit(1)
      }
    }
  )
  .command(
    'send',
    'Send OSC messages',
    {
      address: {
        alias: 'a',
        type: 'string',
        default: '0.0.0.0',
        describe: 'The IP address you want to send to',
      },
      port: {
        alias: 'p',
        type: 'number',
        default: 8888,
        demandOption: true,
        describe: 'The port you want to send to',
      },
    },
    async (argv: Arguments<SendArgs>) => {
      try {
        const port =
          typeof argv.port === 'string'
            ? parseInt(argv.port, 10)
            : (argv.port as number)

        if (Number.isNaN(port) || port < 1 || port > 65535) {
          console.error(
            'Invalid port number. Port must be between 1 and 65535.'.red
          )
          process.exit(1)
        }

        await send({
          port,
          address: argv.address || null,
          version: packageInfo.version,
        })
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`
            .red
        )
        process.exit(1)
      }
    }
  )
  .command(
    '$0',
    false,
    () => {},
    () => {
      runInteractive().catch((err) => {
        console.error('An error occurred:'.red)
        if (err instanceof Error) {
          console.error(err.message)
          if (err.stack) {
            console.error(err.stack)
          }
        } else {
          console.error(String(err))
        }
        process.exit(1)
      })
    }
  )
  .version(packageInfo.version)
  .help(false)
  .alias('h', 'help')
  .showHelpOnFail(false)
  .command(
    '*',
    false,
    () => {},
    (argv) => {
      if (argv.help || argv.h) {
        console.log(
          `OSC Debugger\n\n`.yellow.bold +
            `A simple but charming OSC debugging tool for the terminal. Runs in interactive mode if no command is specified.\n\n` +
            `Commands:\n` +
            `  monitor [target]              Monitor OSC messages\n` +
            `    Options:\n` +
            `      -p, --port <number>       Port to listen on (default: 8888)\n` +
            `      -a, --address <string>    IP address to listen on (default: 0.0.0.0)\n` +
            `      -l, --log                 Enable logging to file\n` +
            `      -f, --logFile <path>      Log file path (default: osc-monitor-timestamp.log)\n` +
            `      [target]                  Address:port format (e.g., 127.0.0.1:9000)\n\n` +
            `  send                         Send OSC messages\n` +
            `    Options:\n` +
            `      -p, --port <number>       Port to send to (required)\n` +
            `      -a, --address <string>    IP address to send to (default: 0.0.0.0)\n\n` +
            `Examples:\n` +
            `  osc-debugger monitor 127.0.0.1:9000\n` +
            `  osc-debugger monitor -p 9000 -a 127.0.0.1 --log\n` +
            `  osc-debugger send -p 9000 -a 127.0.0.1\n\n` +
            `Global Options:\n` +
            `  -h, --help                    Show this help message\n` +
            `  --version                     Show version number\n`
        )
        process.exit(0)
      }
      if (argv.version) {
        console.log(packageInfo.version)
        process.exit(0)
      }
    }
  )
  .parse()
