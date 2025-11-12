import net from 'net';

// Wait for a TCP port to be open. This is protocol-agnostic and avoids http/https issues.
export async function waitForSplunk(host = 'localhost', port = 8089, timeout = 180000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host, port }, () => {
          socket.end();
          resolve();
        });
        socket.on('error', (err) => {
          try { socket.destroy(); } catch (e) {}
          reject(err);
        });
        // guard: if connect hangs, destroy after 2s
        const t = setTimeout(() => {
          try { socket.destroy(); } catch (e) {}
          reject(new Error('timeout'));
        }, 2000);
        // cleanup timer on settle
        const cleanup = () => clearTimeout(t);
        socket.once('close', cleanup);
        socket.once('end', cleanup);
      });
      return true;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Splunk did not become ready within timeout');
}
