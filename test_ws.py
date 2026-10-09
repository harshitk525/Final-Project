import asyncio
import websockets
import json

async def test():
    uri = "ws://127.0.0.1:8000/ws/disruptions"
    async with websockets.connect(uri) as ws:
        msg = await ws.recv()
        print("Connected successfully! Received:", msg)
        await ws.send(json.dumps({"type": "PING"}))
        resp = await ws.recv()
        print("Ping response:", resp)

if __name__ == "__main__":
    asyncio.run(test())
