# coding: utf-8
import sys
import os
sys.path.append(os.path.dirname(sys.path[0]))
# 将到上一层路径加入sys.path以便正常测试import
import time
from easycoins import OKCoin
import json

# log configuration
import logging
# 设置屏幕输出句柄
formatter = logging.Formatter(
    '[%(levelname)s] %(asctime)s - %(name)s - %(lineno)d - %(message)s'
)
logger = logging.getLogger("OKExWS")
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)

import mercury # pip install mercury-client
mercury_app = mercury.MercuryApp(name="okcoin_pub")

def okex_handler(ws, msg):
    for item in msg:
        channel = "mercury.okex." + item["channel"]
        # print(item)
        mercury_app.publish(channel=channel, message=item)

okcoin = OKCoin()
okex_ws = okcoin.create_okex_ws(on_message=okex_handler)
okex_ws.start()

okex_ws.subscribe_ticker("btc", "this_week")
okex_ws.subscribe_ticker("btc", "next_week")

while True:
    time.sleep(10)