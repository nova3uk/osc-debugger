import * as osc from 'osc-min'
import colors from 'colors'
import { Socket, RemoteInfo } from 'dgram'
import { createWriteStream, WriteStream } from 'fs'
import { join } from 'path'

import createSocket from './createSocket.js'

export interface MonitorOptions {
  port: number
  address?: string
  version?: string
  logFile?: string | null
}

interface OscArgument {
  type?: string
  value?: unknown
}

interface OscMessage {
  address: string
  args?: OscArgument[]
}

export default async function monitor({
  port,
  address = '0.0.0.0',
  version = 'unknown',
  logFile = null,
}: MonitorOptions): Promise<void> {
  try {
    // Validate port
    if (port < 1 || port > 65535) {
      throw new Error(
        `Invalid port number: ${port}. Port must be between 1 and 65535.`
      )
    }

    // Setup logging
    let logStream: WriteStream | null = null
    if (logFile !== null) {
      let logPath: string
      if (logFile) {
        logPath = logFile
      } else {
        // Generate default filename with timestamp
        const startTime = new Date()
        const timestamp = startTime
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, -5) // Remove milliseconds and timezone
        logPath = join(process.cwd(), `osc-monitor-${timestamp}.log`)
      }

      try {
        logStream = createWriteStream(logPath, { flags: 'a' })
        console.log(`Logging to: ${logPath}`.cyan)
      } catch (err) {
        console.error(
          `Failed to create log file: ${err instanceof Error ? err.message : String(err)}`
            .red
        )
        // Continue without logging
      }
    }

    const socket: Socket = await createSocket(port, address)

    socket.on('message', (buffer: Buffer, rinfo: RemoteInfo) => {
      try {
        const message: OscMessage = osc.fromBuffer(buffer) as OscMessage

        if (!message.address) {
          console.warn('Received OSC message without address'.yellow)
          return
        }

        // Format timestamp in Wireshark format: YYYY-MM-DD HH:MM:SS.microseconds
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        const microseconds = String(now.getMilliseconds() * 1000).padStart(
          6,
          '0'
        )
        const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${microseconds}`

        // Get sender info
        const senderIp = rinfo.address
        const senderPort = rinfo.port
        const messageSize = buffer.length

        // Build the log line
        const timestampStr = timestamp.gray
        const senderStr = `${senderIp}:${senderPort}`.magenta
        const sizeStr = `${messageSize}B`.gray

        // Build plain text version for file logging (no colors)
        let plainLogLine: string

        if (message.args && message.args.length > 0) {
          // Handle all arguments, including null values
          const argValues: string[] = message.args.map((arg: OscArgument) => {
            if (arg === null || arg === undefined) {
              return 'null'
            }
            if (arg.value === null || arg.value === undefined) {
              return 'null'
            }
            return String(arg.value)
          })

          const argTypes: string[] = message.args.map((arg: OscArgument) => {
            if (arg === null || arg === undefined) {
              return 'null'
            }
            return arg.type || 'unknown'
          })

          const consoleLine = `${timestampStr} ${senderStr} ${sizeStr} ${message.address.padEnd(30).yellow} ${colors.cyan(
            argValues.join(', ')
          )} (${argTypes.join(', ').white})`
          plainLogLine = `${timestamp} ${senderIp}:${senderPort} ${messageSize}B ${message.address.padEnd(30)} ${argValues.join(', ')} (${argTypes.join(', ')})`

          console.log(consoleLine)
        } else {
          // no payload
          const consoleLine = `${timestampStr} ${senderStr} ${sizeStr} ${message.address.padEnd(30).yellow} (${'null'.white})`
          plainLogLine = `${timestamp} ${senderIp}:${senderPort} ${messageSize}B ${message.address.padEnd(30)} (null)`

          console.log(consoleLine)
        }

        // Write to log file if enabled
        if (logStream) {
          logStream.write(plainLogLine + '\n')
        }
      } catch (err) {
        console.error('Error parsing OSC message:'.red)
        console.error(err instanceof Error ? err.message : String(err))
      }
    })

    socket.on('error', (err: Error) => {
      console.error('Socket error in monitor:'.red)
      console.error(err.message)
      if (logStream) {
        logStream.write(`ERROR: ${err.message}\n`)
      }
    })

    // Handle cleanup on exit
    const cleanup = () => {
      if (logStream) {
        logStream.end()
        console.log('\nLog file closed.'.gray)
      }
      socket.close()
      if (process.stdin.isRaw) {
        process.stdin.setRawMode(false)
      }
      process.stdin.pause()
      process.exit(0)
    }

    // Setup keyboard input for 'q' to quit
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')

      process.stdin.on('data', (key: string) => {
        // Check for 'q' or 'Q' to quit
        if (key === 'q' || key === 'Q' || key === '\u0003') {
          // \u0003 is Ctrl+C
          console.log('\nExiting...'.yellow)
          cleanup()
        }
      })
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)

    console.log('\n' + '═'.repeat(60).gray)
    console.log(`OSC Debugger v${version} - Monitor Mode`.cyan.bold)
    console.log('═'.repeat(60).gray)
    console.log(`Listening on ${address}:${port}`.yellow)
    if (logStream) {
      console.log(`Logging enabled`.cyan)
    }
    console.log(`Ready to receive OSC messages...`.gray)
    console.log(`Press 'q' or Ctrl+C to exit\n`.gray)
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error occurred'
    console.error(`Failed to start monitor: ${errorMessage}`.red)
    throw err
  }
}
