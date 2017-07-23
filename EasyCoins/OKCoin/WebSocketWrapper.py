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
                    self.logger = logging.getLogger(logger_name)
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

        # resume states
        ws.resume_state()

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
            ws.state_snapshot()
            ws.clear_state()

        if ws._on_close:
            ws._on_close(ws)
        if ws._auto_reconnect == True:
            threading.Thread(target=ws.restart, daemon=True).start()

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
        ws.logger.error("{}: {}".format(error.errno, error.strerror))
        if ws._on_error:
            ws._on_error(ws, error)

    @staticmethod
    def __on_pong(ws):
        ws.logger.debug("pong")
        ws.last_pong_tm = time.time()
        if ws._on_pong:
            ws._on_pong(ws)

    def on_add_channel(self, channel_name):
        if channel_name not in self.subscribed_channels:
            self.subscribed_channels.append(channel_name)
            self.logger.debug("{} on_add_channel".format(self.name))
            return True
        return False

    def on_remove_channel(self, channel_name):
        if channel_name in self.subscribed_channels:
            self.subscribed_channels.pop(
                i=self.subscribed_channels.index(channel_name)
            )
            self.logger.debug("{} on_remove_channel".format(self.name))
            return True
        else:
            return False

    def on_login(self):
        self.logger.debug("{} on login".format(self.name))
        self.has_login = True

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
        self.__state_to_be_resumed = dict(
            has_login=self.has_login,
            subscribed_channels=list()
        )     # this dict stores critical variables for web socket to resume states after restarting
        self.use_log(logger=logger, logger_name=self._name)

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

    #############################################################################################################
    # We call state_snapshot() to save the critical variables used to restore the states after restarting.      #
    #                                                                                                           #
    # clear_state() is called soon after state_snapshot(), because we need the indicators (such as "has_login") #
    # shows the correct currenct state of the okws.                                                             #
    #                                                                                                           #
    # resume_state() is called "on open", as soon as the websocket is connected                                 #
    #                                                                                                           #
    #############################################################################################################
    def state_snapshot(self):
        import copy
        self.__state_to_be_resumed = dict(
            has_login=self.has_login,
            subscribed_channels=copy.copy(self.subscribed_channels)
        )
        self.logger.debug("{}: __state_to_be_resumed - {}".format(self.name, self.__state_to_be_resumed))

    def clear_state(self):
        self.has_login = False
        self.subscribed_channels = list()

    def resume_state(self):
        self.logger.debug("{} call resume_state".format(self.name))
        if self.__state_to_be_resumed["has_login"] == True and self.has_login == False:
            self.logger.debug("Resume Login.")
            self.login()
        for channel in self.__state_to_be_resumed["subscribed_channels"]:
            self.subscribe(channel)

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

    ###############################
    #   Common High Level APIs    #
    ###############################
    def start(self, timeout=3):
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
            self,
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

    def subscribe_ticker(self, x):
        """
        订阅行情数据
        :param x: string: "btc", "ltc", or "eth"
        :return:
        """
        channel = "ok_sub_spotcny_" + x + "_ticker"
        self.subscribe(channel)

    def subscribe_depth(self, x, y=None):
        """
        订阅现货市场深度行情（类似n档挂单/全息盘口）
        y=20即20档盘口，y=60即60档盘口

        y=None则推送盘口变化（第一条会返回一个全息盘口，此后最快大约每50毫秒会有一次推送。官方文档说是200增量更新）
        :param x: string: "btc", "ltc", or "eth"
        :param y: 20/60/None, None by default
        :return:
        官方文档使用描述:
	        1，第一次返回全量数据
	        2，根据接下来数据对第一次返回数据进行，如下操作
	            删除（量为0时）
	            修改（价格相同量不同）
	            增加（价格不存在）
            bids([string, string]):买方深度
            asks([string, string]):卖方深度
            timestamp(string):服务器时间戳
        """
        if y is None:
            channel = "ok_sub_spot_" + x + "_depth"
        else:
            channel = "ok_sub_spot_" + x + "_depth" + "_" + str(y)
        self.subscribe(channel)

    def subscribe_trades(self, x,):
        """
        订阅逐笔成交明细
        :return:
        """
        channel = "ok_sub_spotcny_" + x + "_trades"
        self.subscribe(channel)

    def subscribe_kline(self, x, period):
        """
        :param x: btc, ltc, eth
        :param y: 1min, 3min, 5min, 15min, 30min, 1hour, 2hour, 4hour, 6hour, 12hour, day, 3day, week
        :return:
        """
        channel = "ok_sub_spotcny_{}_kline_{}".format(x, period)
        self.subscribe(channel)

    def get_user_info(self):
        """

        :return:
        """
        channel = "ok_spotcny_userinfo"
        self.request(
            event="addChannel",
            channel=channel,
            parameters={
                'api_key': self.api_key
            }
        )
        return True

    def get_order_info(self, symbol='', order_id=''):
        """
        @:param symbol: btc_cny, ltc_cny, eth_cny
        @:param order_id
        :return:
        """
        channel = "ok_spotcny_orderinfo"
        self.request(
            event="addChannel",
            channel=channel,
            parameters={
                'api_key': self.api_key,
                'symbol': symbol,
                'order_id': order_id
            }
        )

    def trade(self, trade_action='', symbol='', amount='', volume=''):
        """
        IMPORTANT! 由于作者认为官方接口提供的字段名容易引起歧义，
        这个python接口对字段名字重新进行了定义，并给出解释
        :param trade_action: buy/sell/buy_market/sell_market
        :param symbol:
        :param amount: 消耗总金额(RMB)，对应官方文档中的price字段，但是这个数值不是单价，不是单价，不是单价，重要的事情说三遍
         所以python接口用amount来命名，代表总金额。
        :param volume: 购买比特币的数量，官方文档中是amount字段，这里用volume来代替
        :return:
        """
        parameters = None
        if trade_action in ["buy", "sell"]:     # 限价单
            parameters={
                'api_key': self.api_key,
                'symbol': symbol,
                'type': trade_action,
                'price': str(amount),
                'amount': str(volume)
            }
        elif trade_action == "buy_market":
            parameters={
                'api_key': self.api_key,
                'symbol': symbol,
                'type': trade_action,
                'amount': str(amount)           # 市价买只需要填写想要消耗的CNY数量，无需填写比特币数量
            }
        elif trade_action == "sell_market":     # 市价卖只需要填写想要卖出比特币的数量，不需要填写金额
            parameters={
                'api_key': self.api_key,
                'symbol': symbol,
                'type': trade_action,
                'amount': str(volume)
            }
        if parameters:
            self.request(
                event="addChannel",
                channel="ok_spotcny_trade",
                parameters=parameters
            )
            return True
        else:
            return False

    def cancel_order(self, symbol, order_id="-1"):
        """

        :param symbol:
        :return:
        """
        parameters = {
            'api_key': self.api_key,
            'symbol': symbol,
            'order_id': order_id
        }
        self.request(
            event="addChannel",
            channel="ok_spotcny_cancel_order",
            parameters=parameters
        )
        return True


class OKExWS(OKWebSocketBase):
    def __init__(
            self,
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

    def subscribe_ticker(self, x, contract_type):
        """

        :param x: btc, ltc
        :param contract_type: this_week, next_week, quarter
        :return:
        """
        channel = 'ok_sub_future_' + x + '_ticker_' + contract_type
        self.subscribe(channel)

    def subscribe_kline(self, x, contract_type, period):
        """

        :param x:
        :param contract_type:
        :param period:
        :return:
        """
        channel = "ok_sub_future_" + x + "_kline_" + contract_type + "_" + period
        self.subscribe(channel)

    def subscribe_depth(self, x, contract_type, depth):
        """

        :param x:
        :param contract_type:
        :param depth: full/20/60
        :return:
        """
        if depth == "full":
            channel = "ok_sub_future_{}_depth_{}_usd".format(x, contract_type)
        else:
            channel = "ok_sub_future_{}_depth_{}_{}".format(x, contract_type, depth)
        self.subscribe(channel)

    def subscribe_trade(self, x, contract_type):
        """
        :param x: btc, ltc
        :param contract_type:
        :return:
        """
        channel = "ok_sub_futureusd_{}_trade_{}".format(x, contract_type)
        self.subscribe(channel)

    def subscribe_index(self, x):
        """

        :param x: btc, ltc
        :return:
        """
        channel = "ok_sub_futureusd_{}_index".format(x)
        self.subscribe(channel)

    def subscribe_delivery_price_forcast(self, x):
        """
        Deprecated: This does not need to be subscribed and will be automatically returned 1 hour prior to delivery.
        :param x: btc, ltc
        :return:
        """
        channel = "{}_forecast_price".format(x)
        self.subscribe(channel)

    ###################
    # Trade Related   #
    ###################
    def trade(self, symbol, contract_type, price, volume, order_type, match_price, lever_rate):
        """
        :param symbol:
        :param contract_type:
        :param price:
        :param volume:
        :param order_type:
        :param match_price:
        :param lever_rate:
        :return:
        """
        # TODO UnitTest

        parameters={
            'api_key': self.api_key,
            'symbol': symbol,
            'contract_type': contract_type,
            'price': str(price),
            'amount': str(volume),
            'type': str(order_type),
            'match_price': str(match_price),
            'lever_rate': str(lever_rate)
        }
        self.request(
            event="addChannel",
            channel="ok_futureusd_trade",
            parameters=parameters
        )

    def long(self, symbol, contract_type, price, volume, match_price, lever_rate=10):
        """
        A wrapper for self.trade() method.
        """
        self.trade(symbol, contract_type, price, volume, "1", match_price, lever_rate)

    def short(self, symbol, contract_type, price, volume, match_price, lever_rate=10):
        """
        A wrapper for self.trade() method.
        """
        self.trade(symbol, contract_type, price, volume, "2", match_price, lever_rate)

    def sell(self, symbol, contract_type, price, volume, match_price, lever_rate=10):
        """
        A wrapper for self.trade() method.
        """
        self.trade(symbol, contract_type, price, volume, "3", match_price, lever_rate)

    def cover(self, symbol, contract_type, price, volume, match_price, lever_rate=10):
        """
        A wrapper for self.trade() method.
        """
        self.trade(symbol, contract_type, price, volume, "4", match_price, lever_rate)