import * as osc from 'osc-min';
import colors from 'colors';
import { Socket } from 'dgram';

import createSocket from './createSocket.js';

export interface MonitorOptions {
  port: number;
  address?: string;
  version?: string;
}

interface OscArgument {
  type?: string;
  value?: unknown;
}

interface OscMessage {
  address: string;
  args?: OscArgument[];
}

export default async function monitor({
  port,
  address = '0.0.0.0',
  version = 'unknown',
}: MonitorOptions): Promise<void> {
  try {
    // Validate port
    if (port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}. Port must be between 1 and 65535.`);
    }

    const socket: Socket = await createSocket(port, address);

    socket.on('message', (buffer: Buffer) => {
      try {
        const message: OscMessage = osc.fromBuffer(buffer) as OscMessage;

        if (!message.address) {
          console.warn('Received OSC message without address'.yellow);
          return;
        }

        if (message.args && message.args.length > 0) {
          // Handle all arguments, including null values
          const argValues: string[] = message.args.map((arg: OscArgument) => {
            if (arg === null || arg === undefined) {
              return 'null';
            }
            if (arg.value === null || arg.value === undefined) {
              return 'null';
            }
            return String(arg.value);
          });

          const argTypes: string[] = message.args.map((arg: OscArgument) => {
            if (arg === null || arg === undefined) {
              return 'null';
            }
            return arg.type || 'unknown';
          });

          console.log(
            `${`[${port}]`.gray} ${message.address.padEnd(30).yellow} ${colors.cyan(
              argValues.join(', ')
            )} (${argTypes.join(', ').white})`
          );
        } else {
          // no payload
          console.log(
            `${`[${port}]`.gray} ${message.address.padEnd(30).yellow} (${'null'.white})`
          );
        }
      } catch (err) {
        console.error('Error parsing OSC message:'.red);
        console.error(err instanceof Error ? err.message : String(err));
      }
    });

    socket.on('error', (err: Error) => {
      console.error('Socket error in monitor:'.red);
      console.error(err.message);
    });

    console.log('\n' + '═'.repeat(60).gray);
    console.log(`OSC Debugger v${version} - Monitor Mode`.cyan.bold);
    console.log('═'.repeat(60).gray);
    console.log(`Listening on ${address}:${port}`.yellow);
    console.log(`Ready to receive OSC messages...`.gray);
    console.log(`Press Ctrl+C to exit\n`.gray);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error occurred';
    console.error(`Failed to start monitor: ${errorMessage}`.red);
    throw err;
  }
}
