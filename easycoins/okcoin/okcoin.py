# coding: utf-8
from .WebSocketWrapper import OKExWS, OKCoinWS

class WebSocketExistsException(BaseException):
    def __init__(self, class_name, name):
        self.msg = "Websocket {} already Exists. Use {}".format(class_name, name)

class OKCoin:
    def __init__(self):
        self._okcoin_ws = None
        self._okex_ws = None

    @property
    def okcoin_ws(self):
        if self._okcoin_ws is None:
            return self.create_okcoin_ws()
        else:
            return self._okcoin_ws

    @property
    def okex_ws(self):
        if self._okex_ws is None:
            return self.create_okex_ws()
        else:
            return self._okex_ws

    def create_okex_ws(
            self,
            name="OKExWS",
            url="wss://real.okex.com:10440/websocket/okcoinapi",
            on_open=None,
            on_close=None,
            on_error=None,
            on_message=None,
            on_pong=None,
            api_key="",
            secret_key="",
            logger=True
    ):
        if self._okex_ws is not None:
            raise WebSocketExistsException("OKExWS", "OKCoin.okex_ws")
        else:
            self._okex_ws = OKExWS(
                name=name,
                url=url,
                on_open=on_open,
                on_close=on_close,
                on_error=on_error,
                on_message=on_message,
                on_pong=on_pong,
                api_key=api_key,
                secret_key=secret_key,
                logger=logger
            )
            return self._okex_ws

    def create_okcoin_ws(
            self,
            name="OKCoinWS",
            url="wss://real.okcoin.cn:10440/websocket/okcoinapi",
            on_open=None,
            on_close=None,
            on_error=None,
            on_message=None,
            on_pong=None,
            api_key="",
            secret_key="",
            logger=True
    ):
        if self._okcoin_ws is None:
            self._okcoin_ws = OKCoinWS(
                name=name,
                url=url,
                on_open=on_open,
                on_close=on_close,
                on_error=on_error,
                on_message=on_message,
                on_pong=on_pong,
                api_key=api_key,
                secret_key=secret_key,
                logger=logger
            )
            return self._okcoin_ws
        else:
            raise WebSocketExistsException("OKCoinWS", "OKCoin.okcoin_ws")