import asyncio
import websockets
import json
import urllib.request
import urllib.parse

async def test_live_broadcast():
    uri = "ws://127.0.0.1:8000/ws/disruptions"
    async with websockets.connect(uri) as ws:
        handshake = await ws.recv()
        print("1. Handshake received:", handshake)

        # Trigger live report submission via HTTP
        params = urllib.parse.urlencode({
            "station": "Metro South",
            "line": "Metro South Link",
            "severity": "Severe",
            "category": "Accessibility",
            "headline": "Elevator Platform 1 Breakdown",
            "reporter_name": "Rider Sarah",
        })
        url = f"http://127.0.0.1:8000/api/v1/disruptions/submit-live-report?{params}"
        req = urllib.request.Request(url, method="POST")
        
        with urllib.request.urlopen(req) as resp:
            resp_data = json.loads(resp.read().decode())
            print("2. POST submission response status:", resp_data.get("status"))

        # Check if WebSocket client received the broadcast
        broadcast_msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
        print("3. Real-Time Broadcast received over WebSocket!")
        parsed = json.loads(broadcast_msg)
        print("   Type:", parsed.get("type"))
        print("   Headline:", parsed.get("payload", {}).get("headline"))
        print("   Station:", parsed.get("payload", {}).get("station"))
        print("   Confidence Score:", parsed.get("payload", {}).get("confidence", {}).get("score"))

if __name__ == "__main__":
    asyncio.run(test_live_broadcast())
