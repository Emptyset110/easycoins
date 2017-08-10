# coding: utf-8
import websocket
import hashlib
import threading
import time
import json

class PoloniexWebSocket(websocket.WebSocketApp):
    """
    A wrapper for Poloniex websocket-client using WebSocketApp
    """
    def use_log(self, logger=True, logger_name=None):
        if logger_name is None:
            logger_name = "PoloniexWebSocket"
        if isinstance(logger, bool):
            if logger == False:
                self.logger = None
            else:
                try:
                    import dHydra
                    self.logger = dHydra.logger(logger_name)
                except Exception:
                    print("没有安装dHydra, 使用默认log设置")
                    import logging
                    self.logger = logging.getLogger(logger_name)
        else:
            self.logger = logger

    @staticmethod
    def __on_open(ws):
        ws.logger.debug("{} on open".format(ws.name))
        ws.is_open = True
        ws.last_ping_tm = 0
        ws.last_pong_tm = 0

        # # resume states
        # ws.resume_state()

        if ws._on_open:
            ws._on_open(ws)

    @staticmethod
    def __on_close(ws):
        """
        :param ws:
        :return:
        """
        ws.logger.debug("on close")
        if ws.is_open:
            ws.is_open = False
            # ws.state_snapshot()
            # ws.clear_state()

        if ws._on_close:
            ws._on_close(ws)
        # if ws._auto_reconnect == True:
        #     threading.Thread(target=ws.restart, daemon=True).start()

    @staticmethod
    def __on_message(ws, msg):
        if msg == '{"event":"pong"}':
            ws.on_pong(ws)
        else:
            # 我们要看一下msg内容，以判断如何分发
            msg = json.loads(msg)
            if isinstance(msg, list) and len(msg) == 1:
                if msg[0]["channel"] == "addChannel" and msg[0]["data"]["result"]==True:
                    ws.on_add_channel(channel_name=msg[0]["data"]["channel"])
                elif msg[0]["channel"] == "removeChannel" and msg[0]["data"]["result"]==True:
                    ws.on_remove_channel(channel_name=msg[0]["data"]["channel"])
                elif msg[0]["channel"] == "login" and msg[0]["data"]["result"]=='true':
                    ws.on_login()
            if ws._on_message:
                ws._on_message(ws, msg)
            else:
                ws.logger.info(msg)

    @staticmethod
    def __on_error(ws, error):
        try:
            ws.logger.error("{}: {}".format(error.errno, error.strerror))
        except Exception:
            ws.logger.error("{}".format(error))
        if ws._on_error:
            ws._on_error(ws, error)

    @staticmethod
    def __on_pong(ws):
        ws.logger.debug("pong")
        ws.last_pong_tm = time.time()
        if ws._on_pong:
            ws._on_pong(ws)

    def __init__(
            self,
            name="PoloniexWS",
            on_open=None,
            on_close=None,
            on_message=None,
            on_error=None,
            on_pong=None,
            logger=True,
            api_key="",
            secret_key="",
            url="wss://api2.poloniex.com/"
    ):
        super().__init__(
            url=url,
            on_open=self.__on_open,
            on_close=self.__on_close,
            on_message=self.__on_message,
            on_error=self.__on_error,
            on_pong=self.__on_pong,
        )
        self.name = name
        self._on_open = on_open
        self._on_close = on_close
        self._on_message = on_message
        self._on_error = on_error
        self._on_pong = on_pong
        self._api_key = {"api_key": api_key, "secret_key": secret_key}

        self.is_open = False
        if logger:
            self.use_log()

    def set_api_key(self, api_key, secret_key):
        self._api_key = {"api_key": api_key, "secret_key": secret_key}

    def run_in_thread(self):
        self.keep_running = True
        # if not self.heart_beat_started:
        #     threading.Thread(target=self.heart_beat, daemon=True).start()
        threading.Thread(target=self.run_forever, daemon=True).start()

    ###############################
    #   Common High Level APIs    #
    ###############################
    def start(self, timeout=10):
        """
        开启并等待直到websocket on_open完成
        :param timeout: 连接超时秒数，超时会raise TimeoutError
        :return:
        """
        self.run_in_thread()
        s = time.time()
        while self.is_open == False:
            if time.time() - s > timeout:
                self.logger.error("{} 连接超时".format(self.name))
                raise TimeoutError("{} 连接超时".format(self.name))
            time.sleep(0.1)
        return True