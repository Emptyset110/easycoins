# coding: utf-8
import sys
import os
sys.path.append(os.path.dirname(sys.path[0]))
# 将到上一层路径加入sys.path以便正常测试import

from EasyCoins.OKCoin.WebSocketWrapper import OKWebSocketBase
import time
import logging
from account import get_api_key

formatter = logging.Formatter(
    '[%(levelname)s] %(asctime)s - %(name)s - %(lineno)d - %(message)s'
)

okcoin_ws = OKWebSocketBase(
    name="OKCoinWS",
    url="wss://real.okcoin.cn:10440/websocket/okcoinapi",
    logger=True,     # 日志，默认为True
    on_message=None, # 自定义收到消息时的回调函数
    on_close=None,   # 自定义在websocket关闭前执行的回调函数
    on_error=None,   # 自定义在遇到回调函数出错时候执行的回调函数（非okcoin服务器返回的错误）
    on_open=None     # 自定义在websocket刚建立连接时要执行的回调函数
)

okex_ws = OKWebSocketBase(
    name="OKExWS",
    url="wss://real.okex.com:10440/websocket/okcoinapi",
    logger=True,     # 日志，默认为True
    on_message=None, # 自定义收到消息时的回调函数
    on_close=None,   # 自定义在websocket关闭前执行的回调函数
    on_error=None,   # 自定义在遇到回调函数出错时候执行的回调函数（非okcoin服务器返回的错误）
    on_open=None     # 自定义在websocket刚建立连接时要执行的回调函数
)

# 设置屏幕输出句柄
logger = logging.getLogger(okcoin_ws.name)
"""
将logging设置为DEBUG，用于调试，生产环境可以设置为INFO甚至WARNING
"""
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)

logger = logging.getLogger(okex_ws.name)
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)

api_key_okex = get_api_key("api_key_okex.json")
api_key_okcoin = get_api_key("api_key_okcoin.json")

okex_ws.set_api_key(api_key_okex["api_key"], api_key_okex["secret_key"])
okcoin_ws.set_api_key(api_key_okcoin["api_key"], api_key_okcoin["secret_key"])

# 开启Websocket
okcoin_ws.run_in_thread()
okex_ws.run_in_thread()

# 等待两个Websocket都连接好
while okcoin_ws.is_open == False:
    time.sleep(0.5)

while okex_ws.is_open == False:
    time.sleep(0.5)

# 调用登录
okcoin_ws.login()
okex_ws.login()

# 尝试订阅两个行情接口
# okex_ws.subscribe("ok_sub_futureusd_btc_ticker_next_week")
# okex_ws.subscribe("ok_sub_futureusd_btc_ticker_this_week")

while True:
    time.sleep(20)
    # okcoin_ws.close() # 手动关闭调试重连功能