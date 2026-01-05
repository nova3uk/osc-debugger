import inquirer, { Answers } from 'inquirer'
import * as osc from 'osc-min'
import { Socket } from 'dgram'

import createSocket from './createSocket.js'

// Register command prompt
import commandPrompt from 'inquirer-command-prompt'
inquirer.registerPrompt('command', commandPrompt)

export interface SendOptions {
  port: number
  address?: string | null
  version?: string
}

type ParsedValue = string | number

function parseInputValue(value: string | undefined): ParsedValue {
  if (!value || value.trim() === '') {
    throw new Error('Value cannot be empty')
  }

  // Check if it's a quoted string
  if (/^"[^"]+"$/.test(value)) {
    return value.toString().substring(1, value.length - 1)
  }

  // Check if it contains a decimal point (float)
  if (/\./.test(value)) {
    const floatValue = parseFloat(value)
    if (Number.isNaN(floatValue)) {
      throw new Error(`Invalid number: ${value}`)
    }
    return floatValue
  }

  // Integer
  const intValue = parseInt(value, 10)
  if (Number.isNaN(intValue)) {
    throw new Error(`Invalid integer: ${value}`)
  }
  return intValue
}

async function sendMessage(
  socket: Socket,
  message: Buffer,
  port: number,
  address: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (port < 1 || port > 65535) {
      reject(new Error(`Invalid port number: ${port}`))
      return
    }

    socket.send(
      message,
      0,
      message.length,
      port,
      address,
      (err?: Error | null) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
    )
  })
}

export default async function send({
  port,
  address = null,
  version = 'unknown',
}: SendOptions): Promise<void> {
  try {
    // Validate port
    if (port < 1 || port > 65535) {
      throw new Error(
        `Invalid port number: ${port}. Port must be between 1 and 65535.`
      )
    }

    const socket: Socket = await createSocket()

    let receiverIp: string = address || '0.0.0.0'

    if (!address) {
      const input: Answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'address',
          message: 'What IP address do you want to send to?',
          default: '0.0.0.0',
          validate: (value: string) => {
            if (!value || value.trim() === '') {
              return 'IP address cannot be empty'
            }
            // Basic IP validation
            const ipRegex =
              /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
            if (
              !ipRegex.test(value) &&
              value !== '0.0.0.0' &&
              value !== 'localhost'
            ) {
              return 'Please enter a valid IP address'
            }
            return true
          },
        },
      ])
      receiverIp = input.address as string
    }

    console.log('\n' + '═'.repeat(60).gray)
    console.log(`OSC Debugger v${version} - Send Mode`.cyan.bold)
    console.log('═'.repeat(60).gray)
    console.log(`Target: ${receiverIp}:${port}`.yellow)
    console.log('\nMessage Format:'.yellow)
    console.log(`  <address> <value>`.gray)
    console.log(`  - Address: OSC path (e.g., /light/1/color)`.gray)
    console.log(
      `  - Value: Number or string in quotes (e.g., 42 or "red")`.gray
    )
    console.log(`\nExample:`.gray)
    console.log(`  /light/1/color "red"`.cyan)
    console.log(`  /volume 0.75`.cyan)
    console.log(`  /status 1`.cyan)
    console.log(`\nType your OSC messages below (or 'q' to quit):\n`.gray)

    while (true) {
      try {
        const { input } = await inquirer.prompt<{ input: string }>([
          {
            type: 'command' as any,
            name: 'input',
            message: '>',
            validate: (value: string) => {
              if (!value || value.trim() === '') {
                return 'Input cannot be empty'
              }
              const trimmed = value.trim().toLowerCase()
              // Allow 'q', 'quit', 'exit' to pass validation
              if (trimmed === 'q' || trimmed === 'quit' || trimmed === 'exit') {
                return true
              }
              const parts = value.trim().split(/\s+/)
              if (parts.length < 1) {
                return 'Please provide an OSC address'
              }
              if (!parts[0].startsWith('/')) {
                return 'OSC address must start with /'
              }
              return true
            },
          },
        ])

        const trimmedInput = input.trim()

        // Check for quit commands
        if (trimmedInput.toLowerCase() === 'q' || trimmedInput.toLowerCase() === 'quit' || trimmedInput.toLowerCase() === 'exit') {
          console.log('\nGoodbye!'.yellow)
          socket.close()
          process.exit(0)
        }

        const parts = trimmedInput.split(/\s+/)
        const oscAddress = parts[0]

        if (!oscAddress.startsWith('/')) {
          console.error('OSC address must start with /'.red)
          continue
        }

        const rawValue = parts.slice(1).join(' ')

        if (!rawValue) {
          console.error('Please provide a value'.red)
          continue
        }

        let value: ParsedValue
        try {
          value = parseInputValue(rawValue)
        } catch (err) {
          console.error(
            `Error parsing value: ${err instanceof Error ? err.message : String(err)}`
              .red
          )
          continue
        }

        const messageBuffer = osc.toBuffer({
          address: oscAddress,
          args: Number.isNaN(value as number) ? [] : [value],
        })
        // osc.toBuffer returns a DataView, convert to Buffer
        const message: Buffer = Buffer.from(
          messageBuffer.buffer,
          messageBuffer.byteOffset,
          messageBuffer.byteLength
        )

        await sendMessage(socket, message, port, receiverIp)
        console.log(`Sent: ${oscAddress} = ${String(value)}`.green)
      } catch (err) {
        if (err instanceof Error && err.message.includes('User force closed')) {
          console.log('\nGoodbye!'.yellow)
          process.exit(0)
        }
        console.error(
          `Error sending message: ${err instanceof Error ? err.message : String(err)}`
            .red
        )
      }
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error occurred'
    console.error(`Failed to start send mode: ${errorMessage}`.red)
    throw err
  }
}
