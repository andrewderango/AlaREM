import logging
import logging.handlers
import os
import datetime
import asyncio
import json
from websockets.asyncio.server import serve
from dcm.src.serial.python.SerialMP import PacemakerMPSerial, PMPSerialMsgType, PMParameters

# setup some globals
reconnect_fail: asyncio.Event = asyncio.Event()
first_connection: asyncio.Event = asyncio.Event()
global_pm_id: int = None
pm_serial: PacemakerMPSerial = None

# -- logging setup --

logging.basicConfig(level=logging.INFO, format="%(message)s")
main_logger = logging.getLogger("main")

today = datetime.datetime.now()
if not os.path.exists("logs"):
    os.mkdir("logs")
else:
    i = 1
    while os.path.exists(f"logs/{today.strftime('%Y-%m-%d')}_webserver_{i}.log"):
        i += 1
    today = today.strftime("%Y-%m-%d") + f"_webserver_{i}"
file_handler = logging.handlers.RotatingFileHandler(
    f"logs/{today}.log", maxBytes=10000000, backupCount=5
)
file_handler.setFormatter(
    logging.Formatter("%(asctime)s:%(levelname)s:%(name)s:%(message)s")
)

main_logger.addHandler(file_handler)

serial_logger = logging.getLogger("SerialMP")
serial_logger.addHandler(file_handler)

websockets_logger = logging.getLogger("websockets.server")
websockets_logger.addHandler(file_handler)

# -- end logging setup --


async def _reconnect(websocket):
    global reconnect_fail
    global first_connection
    global pm_serial
    global main_logger
    global global_pm_id

    while True:
        if (
            pm_serial
            and not pm_serial.connected.value
            and pm_serial.connecting.value
            and not first_connection.is_set()
            and not reconnect_fail.is_set()
        ):
            await websocket.send(
                json.dumps({"type": "reconnect", "status": "reconnecting"})
            )
            try:
                pm_serial.close()
                pm_serial = PacemakerMPSerial(baudrate=112500, msg_size=82)
                pm_serial.set_pm_id(global_pm_id)
                res = pm_serial.search_and_connect(mode="reconnect")

                if res.status == PMPSerialMsgType.SUCCESS:
                    main_logger.debug("[RECONNECT] Reconnected to pacemaker")
                    await websocket.send(
                        json.dumps({"type": "reconnect", "status": "success"})
                    )
                else:
                    main_logger.error("[RECONNECT] Failed to reconnect to pacemaker")
                    reconnect_fail.set()
                    pm_serial.close()
                    pm_serial = None
                    first_connection.set()
                    await websocket.send(
                        json.dumps({"type": "reconnect", "status": "failed"})
                    )

            except Exception as e:
                # main_logger.error(f"[RECONNECT] Error: {e}")
                # reconnect_fail.set()
                # pm_serial.close()
                # pm_serial = None
                # first_connection.set()
                # await websocket.send(
                #     json.dumps({"type": "reconnect", "status": "failed"})
                # )
                continue

        await asyncio.sleep(0.1)


async def _consumer_handler(websocket):
    global pm_serial
    global main_logger
    global reconnect_fail
    global first_connection
    global global_pm_id

    async for message in websocket:
        data = json.loads(message)

        if data["type"] == "initialize":
            if first_connection.is_set():
                pm_id = data.get("pm_id", None)
                global_pm_id = pm_id

                if not pm_id:
                    main_logger.error("[MAIN] No pacemaker ID provided")
                    await websocket.send(
                        json.dumps(
                            {"type": "initialize", "status": "failed", "message": "No pacemaker ID provided"}
                        )
                    )
                    continue

                pm_serial = PacemakerMPSerial(baudrate=112500, msg_size=82)
                pm_serial.set_pm_id(pm_id)
                res = pm_serial.search_and_connect(mode="init")

                if res.status == PMPSerialMsgType.SUCCESS:
                    main_logger.debug("[MAIN] Connected to pacemaker")
                    first_connection.clear()
                    reconnect_fail.clear()
                    await websocket.send(
                        json.dumps({"type": "initialize", "status": "success"})
                    )
                else:
                    main_logger.error("[MAIN] Failed to connect to pacemaker")
                    pm_serial.close()
                    pm_serial = None
                    reconnect_fail.set()
                    await websocket.send(
                        json.dumps({"type": "initialize", "status": "failed"})
                    )
                    break
            else:
                main_logger.error("[MAIN] Already connected to pacemaker")
                await websocket.send(
                    json.dumps({"type": "initialize", "status": "failed", "message": "Already connected"})
                )
        elif data["type"] == "disconnect":
            if reconnect_fail.is_set():
                main_logger.error("[MAIN] Already disconnected from pacemaker")
                await websocket.send(
                    json.dumps({"type": "disconnect", "status": "failed", "message": "Already disconnected"})
                )
                continue

            if pm_serial:
                pm_serial.close()
                pm_serial = None
                first_connection.set()
                main_logger.debug("[MAIN] Disconnected from pacemaker")
                await websocket.send(
                    json.dumps({"type": "disconnect", "status": "success"})
                )
            else:
                main_logger.error("[MAIN] Not connected to pacemaker")
                await websocket.send(
                    json.dumps({"type": "disconnect", "status": "failed", "message": "Not connected"})
                )
        elif data["type"] == "send_parameters":
            if not pm_serial or reconnect_fail.is_set():
                main_logger.error("[MAIN] Not connected to pacemaker")
                await websocket.send(
                    json.dumps({"type": "send_parameters", "status": "failed", "message": "Not connected"})
                )
                continue

            params = data.get("parameters", None)

            if not params:
                main_logger.error("[MAIN] No parameters provided")
                await websocket.send(
                    json.dumps({"type": "send_parameters", "status": "failed", "message": "No parameters provided"})
                )
                continue

            req = PMParameters(
                mode=params.get("mode", 0),
                lrl=params.get("lrl", 0),
                url=params.get("url", 0),
                arp=params.get("arp", 0),
                vrp=params.get("vrp", 0),
                apw=params.get("apw", 0),
                vpw=params.get("vpw", 0),
                aamp=params.get("aamp", 0),
                vamp=params.get("vamp", 0),
                asens=params.get("asens", 0),
                vsens=params.get("vsens", 0),
                av_delay=params.get("av_delay", 0),
                rate_fac=params.get("rate_fac", 0),
                act_thresh=params.get("act_thresh", 0),
                react_time=params.get("react_time", 0),
                recov_time=params.get("recov_time", 0),
            )

            res = pm_serial.send_parameters(req)

            if res.status == PMPSerialMsgType.SUCCESS:
                main_logger.debug("[MAIN] Parameters sent successfully")
                await websocket.send(
                    json.dumps({"type": "send_parameters", "status": "success"})
                )
            else:
                main_logger.error("[MAIN] Failed to send parameters")
                await websocket.send(
                    json.dumps({"type": "send_parameters", "status": "failed", "message": "Failed to send parameters"})
                )
        elif data["type"] == "toggle_egram":
            if not pm_serial or reconnect_fail.is_set():
                main_logger.error("[MAIN] Not connected to pacemaker")
                await websocket.send(
                    json.dumps({"type": "toggle_egram", "status": "failed", "message": "Not connected"})
                )
                continue

            res = None

            if data["mode"] == "start":
                res = pm_serial.toggle_egram(use_internal=False, explicit_command=True)
            elif data["mode"] == "stop":
                res = pm_serial.toggle_egram(use_internal=False, explicit_command=False)
            elif data["mode"] == "internal":
                res = pm_serial.toggle_egram(use_internal=True)
            else:
                main_logger.error("[MAIN] Invalid egram mode")
                await websocket.send(
                    json.dumps({"type": "toggle_egram", "status": "failed", "message": "Invalid egram mode"})
                )
                continue

            if res.status == PMPSerialMsgType.SUCCESS:
                main_logger.debug("[MAIN] Egram toggled")
                await websocket.send(
                    json.dumps({"type": "toggle_egram", "status": "success"})
                )
            else:
                main_logger.error("[MAIN] Failed to toggle egram")
                await websocket.send(
                    json.dumps({"type": "toggle_egram", "status": "failed"})
                )
        else:
            main_logger.error(f"[MAIN] Unknown message type: {data['type']}")
            await websocket.send(
                json.dumps({"type": "error", "message": "Unknown message type"})
            )


async def _producer_handler(websocket):
    global pm_serial
    global main_logger
    global reconnect_fail

    while True:
        if pm_serial and pm_serial.connected.value and not reconnect_fail.is_set():
            data = pm_serial.consume_egram_data()

            return_data = {}

            if data != {}:
                for timestamp, egram_data in data.items():
                    return_data[timestamp] = {
                        "atrial": egram_data.atrialSense,
                        "ventrical": egram_data.ventricularSense,
                    }

                await websocket.send(
                    json.dumps({"type": "egram_data", "data": return_data})
                )

        await asyncio.sleep(0.01)


async def handler(websocket):
    global reconnect_fail
    global first_connection
    global pm_serial
    global main_logger

    first_connection.set()
    reconnect_task = asyncio.create_task(_reconnect(websocket))
    consumer_task = asyncio.create_task(_consumer_handler(websocket))
    producer_task = asyncio.create_task(_producer_handler(websocket))

    _, pending = await asyncio.wait(
        [consumer_task, producer_task],
        return_when=asyncio.FIRST_COMPLETED,
    )

    for task in pending:
        task.cancel()

    reconnect_task.cancel()
    reconnect_fail.clear()

    if pm_serial:
        pm_serial.close()
        pm_serial = None


async def main():
    global main_logger

    async with serve(handler, "localhost", 8765) as server:
        main_logger.info("[MAIN] Websocket server started")
        try:
            while True:
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            main_logger.info("[MAIN] Websocket server stopping...")
            server.close()
        finally:
            main_logger.info("[MAIN] Websocket server stopped")
            return


if __name__ == "__main__":
    try:
        asyncio.run(main())
    finally:
        main_logger.info("[MAIN] Gracefully exited.")
        file_handler.close()
        logging.shutdown()
