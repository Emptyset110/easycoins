# coding: utf-8
import websocket
import hashlib
import threading
import time
import json


class OKWebSocketBase(websocket.WebSocketApp):
    """
    A wrapper for OkCoin websocket-client using WebSocketApp
    """
    # websocket.enableTrace(True)

    def use_log(self, logger=True, logger_name=None):
        if logger_name is None:
            logger_name = self.name
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
                    self.logger = logging.getLogger(self.name)
        else:
            self.logger = logger

    def __getstate__(self):
        if self.logger is not None:
            return (True,)

    def __setstate__(self, state):
        (logger,) = state
        self.use_log(logger=logger)

    @staticmethod
    def __on_open(ws):
        ws.logger.debug("{} on open".format(ws.name))
        ws.is_open = True
        ws.last_ping_tm = 0
        ws.last_pong_tm = 0
        if ws._on_open:
            ws._on_open(ws)

    @staticmethod
    def __on_close(ws):
        """
        :param ws:
        :return:
        """
        ws.logger.debug("on close")
        ws.is_open = False
        if ws._on_close:
            ws._on_close(ws)

        if ws._auto_reconnect == True:
            threading.Thread(target=ws.restart, daemon=True).start()

    @staticmethod
    def __on_message(ws, msg):
        if msg == '{"event":"pong"}':
            ws.on_pong(ws)
        else:
            if ws._on_message:
                ws._on_message(ws, msg)
            else:
                ws.logger.info(msg)

    @staticmethod
    def __on_error(ws, error):
        ws.logger.error("{}: {}".format(error.errno, error.strerror))
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
            name,
            url,
            on_open=None,
            on_close=None,
            on_message=None,
            on_error=None,
            on_pong=None,
            logger=True,
            api_key="",
            secret_key="",
    ):
        """
        By default, self._auto_reconnect is set to be True, and __on_close will trigger a reconnection automatically.
        If you want to close the websocket forever, use self.kill method
        :param name:
        :param url:
        :param on_open:
        :param on_close:
        :param on_message:
        :param on_error:
        :param on_pong:
        :param api_key:
        :param secret_key:
        """
        super().__init__(
            url=url,
            on_open=self.__on_open,
            on_close=self.__on_close,
            on_message=self.__on_message,
            on_error=self.__on_error,
            on_pong=self.__on_pong,
        )
        self._on_open = on_open
        self._on_close = on_close
        self._on_message = on_message
        self._on_error = on_error
        self._on_pong = on_pong
        self._api_key = {"api_key": api_key, "secret_key": secret_key}
        self._name = name
        self._auto_reconnect = True
        self.is_open = False
        self.heart_beat_started = False # only one

        self.has_login = False
        self.subscribed_channels = list()
        self.__state_to_be_resumed = dict() # this dict stores

        self.use_log(logger=logger)

    @property
    def api_key(self):
        return self._api_key["api_key"]

    @property
    def name(self):
        return self._name

    def kill(self):
        self._auto_reconnect = False
        self.close()

    def restart(self):
        while self.sock:
            time.sleep(0.1)
        self.logger.info("{} will restart in 2 seconds".format(self.name))
        time.sleep(2)
        self.run_in_thread()

    #####################################################################################################
    # We call state_snapshot() to save the critical variables used to restore the states after restarting.
    #
    # reset_state() is called soon after state_snapshot(), because we need the indicators (such as "has_login")
    # shows the correct currenct state of the okws.
    #
    # resume_state() is called "on open", as soon as the websocket is connected
    #
    #####################################################################################################
    def state_snapshot(self):
        # TODO
        self.__state_to_be_resumed = {
            "channels": self.subscribed_channels,
            "has_login": self.has_login,
        }

    def reset_state(self):
        # TODO
        # subscribed channels
        # has_login
        pass

    def resume_state(self):
        # TODO
        pass

    def set_api_key(self, api_key, secret_key):
        self._api_key = {"api_key": api_key, "secret_key": secret_key}

    def run_in_thread(self):
        self.keep_running = True
        if not self.heart_beat_started:
            threading.Thread(target=self.heart_beat, daemon=True).start()
        threading.Thread(target=self.run_forever, daemon=True).start()

    def heart_beat(self, ping_timeout=3):
        """
        send "ping" every 30s
        :return:
        """
        self.heart_beat_started = True
        self.logger.debug("{}: heart_beat started".format(self.name))
        while True:
            try:
                if self.keep_running and self.is_open:
                    if time.time() - self.last_ping_tm > 30:
                        self.send('{"event":"ping"}')
                        self.logger.debug("ping")
                        self.last_ping_tm = time.time()
                        if self.last_pong_tm == 0:
                            self.last_pong_tm = self.last_ping_tm - 30
                    else:
                        time.sleep(1)
                    if self.last_ping_tm - self.last_pong_tm > 30 + ping_timeout:
                        # ping/pong Timeout
                        self.logger.warning("ping/pong timeout close")
                        self.close()
            except Exception as e:
                self.logger.error("{}".format(e))

    def compute_sign(self, parameters,):
        """
        注意，因为python函数传参特点，不要将self._api_key字典地址直接传给parameters
        :param parameters:
        :return:
        """
        sign = ''
        if "secret_key" in parameters:
            parameters.pop("secret_key")
        secret_key = self._api_key["secret_key"]
        for key in sorted(parameters.keys()):
            sign += key + '=' + str(parameters[key]) + '&'
        data = sign + 'secret_key=' + secret_key
        sign = hashlib.md5(data.encode("utf8")).hexdigest().upper()
        return sign

    ##########################
    # Common High Level APIs #
    ##########################
    def request(self, event, channel=None, parameters=None):
        data = {
            "event": event,
        }
        if channel is not None:
            data["channel"] = channel
        if parameters is not None:
            sign = self.compute_sign(parameters)
            parameters["sign"] = sign
            data["parameters"] = parameters
        self.send(json.dumps(data))

    def subscribe(self, channel):
        self.request(event="addChannel", channel=channel)

    def unsubscribe(self, channel):
        self.request(event="removeChannel", channel=channel)

    def login(self):
        self.request(
            event="login",
            parameters={
                "api_key": self.api_key
            }
        )

class OKCoinWS(OKWebSocketBase):
    def __init__(
            name="OKCoinWS",
            url="wss://real.okcoin.cn:10440/websocket/okcoinapi",
            on_open=None,
            on_close=None,
            on_message=None,
            on_error=None,
            on_pong=None,
            logger=True,
            api_key="",
            secret_key="",
    ):
        super().__init__(
            name=name,
            url=url,
            on_open=on_open,
            on_close=on_close,
            on_message=on_message,
            on_error=on_error,
            on_pong=on_pong,
            logger=logger,
            api_key=api_key,
            secret_key=secret_key,
        )

class OKExWS(OKWebSocketBase):
    def __init__(
            name="OKExWS",
            url="wss://real.okex.com:10440/websocket/okcoinapi",
            on_open=None,
            on_close=None,
            on_message=None,
            on_error=None,
            on_pong=None,
            logger=True,
            api_key="",
            secret_key="",
    ):
        super().__init__(
            name=name,
            url=url,
            on_open=on_open,
            on_close=on_close,
            on_message=on_message,
            on_error=on_error,
            on_pong=on_pong,
            logger=logger,
            api_key=api_key,
            secret_key=secret_key,
        )