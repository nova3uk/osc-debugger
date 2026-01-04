import { createSocket, Socket } from 'dgram';

export interface SocketOptions {
  port?: number | null;
  address?: string | null;
}

export default async function createUdpSocket(
  port: number | null = null,
  address: string | null = null
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const udp: Socket = createSocket('udp4');

    udp.on('error', (err: Error) => {
      console.error('Socket error:');
      console.error(err);
      if (err.stack) {
        console.error(err.stack);
      }
      udp.close();
      reject(err);
    });

    if (port !== null && port !== undefined) {
      // Validate port range
      if (port < 1 || port > 65535) {
        const error = new Error(`Invalid port number: ${port}. Port must be between 1 and 65535.`);
        udp.close();
        reject(error);
        return;
      }

      udp.on('listening', () => {
        const addr = udp.address();
        if (addr) {
          console.log(
            `\n⚡️  OSC Debugger server listening to ${addr.address}:${addr.port}`.yellow.bold
          );
        }
        resolve(udp);
      });

      try {
        udp.bind(port, address || undefined);
      } catch (err) {
        udp.close();
        reject(err);
      }
    } else {
      resolve(udp);
    }
  });
}
