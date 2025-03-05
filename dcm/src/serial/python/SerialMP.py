import multiprocessing
import struct
import serial
import platform
import random
import serial.tools.list_ports
import time
import logging
from enum import Enum
from typing import Optional, Dict, NamedTuple, List

logger = logging.getLogger("SerialMP")


class MsgStatus(Enum):
    FULFILLING = 0
    FULFILLED = 1
    FAILED = 2


class PMPSerialMsgType(Enum):
    SUCCESS = 0
    ERROR = 1


class Msg(NamedTuple):
    msg_id: int
    msg_type: int
    msg_status: MsgStatus
    msg: Optional[bytearray]


class PMPSerialMsg(NamedTuple):
    status: PMPSerialMsgType
    msg: Optional[str]


class PMPEgramData(NamedTuple):
    atrialSense: List[float]
    ventricularSense: List[float]


class PMParameters(NamedTuple):
    mode: int  # restrict to 0, 100, 200, 111, 221
    lrl: int  # lower rate limit
    url: int  # upper rate limit
    arp: int  # atrial refractory period
    vrp: int  # ventricular refractory period
    apw: int  # atrial pulse width
    vpw: int  # ventricular pulse width
    aamp: float  # atrial amplitude
    vamp: float  # ventricular amplitude
    asens: float  # atrial sensitivity
    vsens: float  # ventricular sensitivity
    av_delay: int # av delay
    rate_fac: int # rate factor
    act_thresh: int # activity threshold
    react_time: int # reaction time
    recov_time: int # recovery time


class PacemakerMPSerial:
    def __init__(self, baudrate: int, msg_size: int) -> None:
        self.baudrate: int = baudrate
        self.msg_size: int = msg_size
        self.serial_id: Optional[int] = None
        self.serial_port: Optional[serial.Serial] = None
        self.serial_port_name: Optional[str] = None
        self.read_process: Optional[multiprocessing.Process] = None
        self.poll_process: Optional[multiprocessing.Process] = None
        self.manager = multiprocessing.Manager()
        self.read_running = self.manager.Value("b", False)
        self.poll_running = self.manager.Value("b", False)
        self.connected = self.manager.Value("b", False)
        self.connecting = self.manager.Value("b", True)
        self.msg_log: Dict[int, Msg] = self.manager.dict()
        self.egram_msg_log: Dict[int, Msg] = self.manager.dict()
        self.egram_running: bool = False
        self.egram_lock = multiprocessing.Lock()

    def __del__(self) -> None:
        self.__serial_close()
        logger.debug(f"[__del__] Egram backlog: {self.egram_msg_log}")

    def __read_process(
        self, read_running, msg_log: Dict[int, Msg], egram_msg_log: Dict[int, Msg]
    ) -> None:
        msg_id: Optional[int] = None
        msg_type: Optional[int] = None
        timestamp: Optional[float] = None
        msg: Optional[bytearray] = None

        while read_running.value:
            try:
                if self.serial_port is not None and self.serial_port.is_open:
                    logger.debug("[read_process] Waiting for data...")

                    if self.serial_port.in_waiting < self.msg_size:
                        time.sleep(0.01)
                        continue

                    res = self.serial_port.read(self.msg_size)
                    msg_id = res[0]
                    msg_type = res[1]
                    msg = res[2:]
                    timestamp = int(time.time() * 1000)

                    if msg_type == 0x05:
                        # must handle egram data separately
                        with self.egram_lock:
                            egram_msg_log[timestamp] = Msg(
                                msg_id, msg_type, MsgStatus.FULFILLED, msg
                            )
                            logger.debug(f"[read_process] Egram data received: {msg}")
                    elif msg_id in self.msg_log:
                        msg_log[msg_id] = Msg(
                            msg_id, msg_type, MsgStatus.FULFILLED, msg
                        )
                        logger.debug(
                            f"[read_process] Message received: {msg_id} | {msg}"
                        )
                    else:
                        msg_log[msg_id] = Msg(msg_id, msg_type, MsgStatus.FAILED, msg)
                        logger.debug(
                            f"[read_process] Unknown message received: {msg_id} | {msg}"
                        )
                else:
                    logger.debug("[read_process] Waiting for connection...")
            except Exception as e:
                logger.debug(f"[read_process] Critical failure: {e}")

            time.sleep(0.01)

    def __poll_process(
        self, poll_running, connected, connecting, timeout: float = 0.5
    ) -> None:
        logger.debug("[poll_process] Polling process started")
        while poll_running.value:
            if connected.value:
                logger.debug("[poll_process] Polling for data...")
                msg_id = self.__create_msg(0x02)
                req = bytearray(82)
                req[0] = msg_id
                req[1] = 0x02

                self.__send_raw(req)
                res = self.__block_until_fulfilled(msg_id, timeout=timeout)
                res_msg_id = res.msg_id
                res_msg_type = res.msg_type
                res_bytearray = res.msg

                if res_bytearray is None:
                    logger.debug("[poll_process] Polling failed: No data received")
                    connected.set(False)
                    connecting.set(True)
                    continue

                res_pm_id = struct.unpack("<H", res_bytearray[0:2])[0]

                if (
                    res_msg_id == msg_id
                    and res_msg_type == 0x02
                    and res_pm_id == self.serial_id
                ):
                    logger.debug(f"[poll_process] Polling success: {res_bytearray}")
                else:
                    logger.debug(f"[poll_process] Polling failed: {res_bytearray}")
                    connected.set(False)
                    connecting.set(True)
            else:
                logger.debug("[poll_process] Waiting for connection...")

            time.sleep(0.1)

    def __block_until_fulfilled(self, msg_id: int, timeout: float = 0.5) -> Msg:
        time_now: float = time.time()

        while self.msg_log[msg_id].msg_status != MsgStatus.FULFILLED:
            logger.debug(f"[block_until_fulfilled] Waiting for message: {msg_id}")

            if time.time() - time_now > timeout:
                logger.debug(f"[block_until_fulfilled] Timeout exceeded: {msg_id}")
                self.msg_log[msg_id] = Msg(
                    msg_id, self.msg_log[msg_id].msg_type, MsgStatus.FAILED, None
                )
                return self.msg_log[msg_id]

            time.sleep(0.1)

        logger.debug(f"[block_until_fulfilled] Message fulfilled: {msg_id}")
        msg = self.msg_log[msg_id]
        self.msg_log.pop(msg_id)
        return msg

    def __create_msg(self, msg_type: int) -> int:
        msg_id = random.randint(0, 255)
        while msg_id in self.msg_log:
            msg_id = random.randint(0, 255)

        if msg_type != 0x05:
            self.msg_log[msg_id] = Msg(msg_id, msg_type, MsgStatus.FULFILLING, None)
        logger.debug(f"[create_msg] Message created: {msg_id}")
        return msg_id

    def __scan_ports(self) -> List[str]:
        raw_port_list = serial.tools.list_ports.comports()
        return_list: List[str] = []
        platform_name = platform.system()

        for port in raw_port_list:
            if platform_name == "Windows":
                return_list.append(port.device)
            elif platform_name == "Linux":
                if "ttyUSB" in port.device or "ttyACM" in port.device:
                    return_list.append(port.device)
            elif platform_name == "Darwin":
                if "tty.usbserial" in port.device:
                    return_list.append(port.device)

        return return_list

    def __serial_connect(self, port: str) -> bool:
        try:
            self.serial_port = serial.Serial(
                port=port,
                baudrate=self.baudrate,
            )
            self.read_process = multiprocessing.Process(
                target=self.__read_process,
                args=(self.read_running, self.msg_log, self.egram_msg_log),
            )
            self.poll_process = multiprocessing.Process(
                target=self.__poll_process,
                args=(self.poll_running, self.connected, self.connecting),
            )
            self.read_running.value = True
            self.poll_running.value = True
            self.read_process.start()
            self.poll_process.start()
            logger.debug(f"[serial_connect] Connected to port: {port}")
            return True
        except Exception as e:
            logger.debug(f"[serial_connect] Critical failure: {e}")
            return False

    def __serial_close(self) -> None:
        self.read_running.value = False
        self.poll_running.value = False
        if self.read_process is not None:
            self.read_process.join()
        if self.poll_process is not None:
            self.poll_process.join()
        if self.serial_port is not None and self.serial_port.is_open:
            self.serial_port.close()
        self.serial_port = None
        self.serial_port_name = None
        self.connected.set(False)
        self.connecting.set(True)
        logger.debug("[serial_close] Serial port closed")

    def __send_raw(self, payload: bytearray) -> None:
        if len(payload) != self.msg_size:
            raise ValueError("Invalid payload size")
        try:
            self.serial_port.write(payload)
        except Exception as e:
            logger.critical(f"[send_raw] Critical failure: {e}")
        logger.debug(f"[send_raw] Message sent: {payload}")

    def close(self) -> None:
        self.__serial_close()

    def set_pm_id(self, pm_id: int) -> None:
        self.serial_id = pm_id

    def consume_egram_data(self) -> Dict[int, PMPEgramData]:
        with self.egram_lock:
            if len(self.egram_msg_log) == 0:
                return {}

            egram_data: Dict[PMPEgramData] = {}
            for timestamp, msg in self.egram_msg_log.items():
                atrial_sense = struct.unpack("<" + "f" * 10, msg.msg[0:40])
                ventricular_sense = struct.unpack("<" + "f" * 10, msg.msg[40:80])
                egram_data[timestamp] = PMPEgramData(atrial_sense, ventricular_sense)

            self.egram_msg_log.clear()
            return egram_data

    def search_and_connect(self, mode: str, timeout: int = 10) -> PMPSerialMsg:
        if mode == "init":
            while True:
                ports = self.__scan_ports()
                msg_id: Optional[int] = None

                logger.debug(f"[search_and_connect] Scanned ports: {ports}")
                for port in ports:
                    msg_id = self.__create_msg(0x01)

                    req = bytearray(82)
                    req[0] = msg_id
                    req[1] = 0x01
                    sw_val = [b'H', b'e', b'a', b'r', b't', b'F', b'l', b'o', b'w']
                    req[2:11] = struct.pack("<" + "c" * 9, *sw_val)

                    logger.debug(
                        f"[search_and_connect] Attempting handshake on port: {port}"
                    )
                    open_status = self.__serial_connect(port)
                    if not open_status:
                        logger.debug(
                            f"[search_and_connect] Failed to open port: {port}"
                        )
                        continue

                    self.__send_raw(req)

                    res = self.__block_until_fulfilled(msg_id, timeout=2)
                    res_msg_id = res.msg_id
                    res_msg_type = res.msg_type
                    res_bytearray = res.msg

                    if res_bytearray is None:
                        self.__serial_close()
                        logger.debug(
                            f"[search_and_connect] Failed handshake on port: {port}"
                        )
                        continue

                    res_pm_id = struct.unpack("<H", res_bytearray[0:2])[0]

                    if (
                        res_msg_id == msg_id
                        and res_msg_type == 0x01
                        and res_pm_id == self.serial_id
                    ):
                        self.serial_port_name = port
                        self.connected.set(True)
                        self.connecting.set(False)
                        logger.debug(f"[search_and_connect] Connected on port: {port}")
                        return PMPSerialMsg(
                            PMPSerialMsgType.SUCCESS, f"Connected on port {port}"
                        )
                    else:
                        self.__serial_close()
                        logger.debug(
                            f"[search_and_connect] Failed handshake on port: {port}"
                        )

        elif mode == "reconnect":
            time_now: float = time.time()

            while time.time() - time_now < timeout:
                msg_id: Optional[int] = None
                ports = self.__scan_ports()

                logger.debug(f"[search_and_connect] Scanned reconnect ports: {ports}")
                logger.debug(
                    f"[search_and_connect] Current timeout: {time.time() - time_now}"
                )
                for port in ports:
                    msg_id = self.__create_msg(0x01)

                    req = bytearray(82)
                    req[0] = msg_id
                    req[1] = 0x01
                    sw_val = [b'H', b'e', b'a', b'r', b't', b'F', b'l', b'o', b'w']
                    req[2:11] = struct.pack("<" + "c" * 9, *sw_val)

                    logger.debug(
                        f"[search_and_connect] Attempting reconnect handshake on port: {port}"
                    )
                    open_status = self.__serial_connect(port)
                    if not open_status:
                        logger.debug(
                            f"[search_and_connect] Failed to open port: {port}"
                        )
                        continue

                    self.__send_raw(req)

                    res = self.__block_until_fulfilled(msg_id)
                    res_msg_id = res.msg_id
                    res_msg_type = res.msg_type
                    res_bytearray = res.msg
                    res_pm_id = struct.unpack("<H", res_bytearray[0:2])[0]

                    if (
                        res_msg_id == msg_id
                        and res_msg_type == 0x01
                        and res_pm_id == self.serial_id
                    ):
                        self.serial_port_name = port
                        self.connected.set(True)
                        self.connecting.set(False)
                        logger.debug(
                            f"[search_and_connect] Reconnected on port: {port}"
                        )
                        return PMPSerialMsg(
                            PMPSerialMsgType.SUCCESS, f"Reconnected on port {port}"
                        )
                    else:
                        self.__serial_close()
                        logger.debug(
                            f"[search_and_connect] Failed reconnect handshake on port: {port}"
                        )

            if self.connected.value == False:
                return PMPSerialMsg(PMPSerialMsgType.ERROR, "Failed to reconnect")

        else:
            return PMPSerialMsg(PMPSerialMsgType.ERROR, "Invalid mode")

    def send_parameters(
        self, parameters: PMParameters, retry_limit: int = 5
    ) -> PMPSerialMsg:
        logger.debug(f"[send_parameters] Sending parameters: {parameters}")
        # create the message here as it can be reused
        req = bytearray(82)
        req[1] = 0x03
        req[2] = parameters.mode
        req[3] = parameters.lrl
        req[4] = parameters.url
        req[5:7] = struct.pack("<H", parameters.arp)
        req[7:9] = struct.pack("<H", parameters.vrp)
        req[9] = parameters.apw
        req[10] = parameters.vpw
        req[11:15] = struct.pack("<f", parameters.aamp)
        req[15:19] = struct.pack("<f", parameters.vamp)
        req[19:23] = struct.pack("<f", parameters.asens)
        req[23:27] = struct.pack("<f", parameters.vsens)
        req[27:29] = struct.pack("<H", parameters.av_delay)
        req[29] = parameters.rate_fac
        req[30] = parameters.act_thresh
        req[31] = parameters.react_time
        req[32] = parameters.recov_time

        for _ in range(retry_limit):
            # explicitly check for connection status
            if not self.connected.value:
                return PMPSerialMsg(PMPSerialMsgType.ERROR, "Not connected")

            logger.debug(f"[send_parameters] Attempting to send parameters: {req}")
            msg_id = self.__create_msg(0x03)
            req[0] = msg_id
            self.__send_raw(req)
            res = self.__block_until_fulfilled(msg_id)
            res_msg_id = res.msg_id
            res_msg_type = res.msg_type
            res_bytearray = res.msg

            if (
                res_msg_id == msg_id
                and res_msg_type == 0x03
                and res_bytearray == req[2:]
            ):
                logger.debug(
                    f"[send_parameters] Parameters sent successfully, awaiting verification..."
                )
                # send ack
                ack_msg_id = self.__create_msg(0x04)
                ack = bytearray(82)
                ack[0] = ack_msg_id
                ack[1] = 0x04
                self.__send_raw(ack)

                # wait for verification
                res = self.__block_until_fulfilled(ack_msg_id)
                res_msg_id = res.msg_id
                res_msg_type = res.msg_type
                res_bytearray = res.msg

                if (
                    res_msg_id == ack_msg_id
                    and res_msg_type == 0x04
                    and res_bytearray == req[2:]
                ):
                    logger.debug(
                        f"[send_parameters] Final verification successful: {res_bytearray}"
                    )
                    return PMPSerialMsg(
                        PMPSerialMsgType.SUCCESS, "Parameters sent successfully"
                    )
                else:
                    logger.debug(
                        f"[send_parameters] Final verification failed: {res_bytearray}"
                    )
                    time.sleep(0.5)
                    continue
            else:
                logger.debug(
                    f"[send_parameters] Failed to send parameters: {res_bytearray}, attempting retry..."
                )
                time.sleep(0.5)
                continue

        return PMPSerialMsg(PMPSerialMsgType.ERROR, "Failed to send parameters")

    def toggle_egram(
        self, use_internal: bool = True, explicit_command: bool = False
    ) -> PMPSerialMsg:
        if use_internal:
            if self.egram_running:
                self.egram_running = False
                msg_id = self.__create_msg(0x05)
                req = bytearray(82)
                req[0] = msg_id
                req[1] = 0x05
                req[2] = 0x00

                self.__send_raw(req)
                logger.debug("[toggle_egram] Egram stopped, internal toggle")
            else:
                self.egram_running = True
                msg_id = self.__create_msg(0x05)
                req = bytearray(82)
                req[0] = msg_id
                req[1] = 0x05
                req[2] = 0xFF

                self.__send_raw(req)
                logger.debug("[toggle_egram] Egram started, internal toggle")
        else:
            if explicit_command:
                self.egram_running = True
                msg_id = self.__create_msg(0x05)
                req = bytearray(82)
                req[0] = msg_id
                req[1] = 0x05
                req[2] = 0xFF

                self.__send_raw(req)
                logger.debug("[toggle_egram] Egram started, explicit toggle")
            else:
                self.egram_running = False
                msg_id = self.__create_msg(0x05)
                req = bytearray(82)
                req[0] = msg_id
                req[1] = 0x05
                req[2] = 0x00

                self.__send_raw(req)
                logger.debug("[toggle_egram] Egram stopped, explicit toggle")

        return PMPSerialMsg(PMPSerialMsgType.SUCCESS, "Egram toggled")
