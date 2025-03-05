import asyncio
import json
from websockets.asyncio.server import serve

async def addTwoNumber(a: int, b: int) -> int:
    return a + b

async def handler(websocket):
    async for message in websocket:
        data = json.loads(message)
        if data['cmd'] == 'add':
            result = await addTwoNumber(int(data['a']), int(data['b']))
            await websocket.send(json.dumps({'result': result}))
        else:
            await websocket.send(json.dumps({'error': 'unknown command'}))

async def main():
    async with serve(handler, 'localhost', 8765) as server:
        await server.serve_forever()

if __name__ == '__main__':
    asyncio.run(main())