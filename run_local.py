"""Serve KYOHO on localhost using only Python's standard library."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import webbrowser


def main() -> None:
    parser = argparse.ArgumentParser(description='巨歩 KYOHO — local static server')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--open', action='store_true', help='Open the game in the default browser')
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('--port must be between 1024 and 65535')
    root = Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    url = f'http://127.0.0.1:{args.port}/'
    try:
        with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
            print(f'巨歩 KYOHO: {url}\nStop: Ctrl+C\nJapan mode needs internet access to GSI tiles.')
            if args.open:
                webbrowser.open(url)
            server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
    except OSError as exc:
        parser.exit(1, f'Cannot start the server: {exc}\nTry another --port.\n')


if __name__ == '__main__':
    main()
