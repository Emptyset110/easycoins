# coding: utf-8
import sys
import os
sys.path.append(os.path.dirname(sys.path[0]))
# 将到上一层路径加入sys.path以便正常测试import
import time
from EasyCoins import OKCoin

"""
将logging设置为DEBUG，用于调试，生产环境可以设置为INFO甚至WARNING

logging是可以全局设置的类
"""
import logging
# 设置屏幕输出句柄
formatter = logging.Formatter(
    '[%(levelname)s] %(asctime)s - %(name)s - %(lineno)d - %(message)s'
)
logger = logging.getLogger("OKCoin")
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)
logger = logging.getLogger("OKCoinWS")
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)
logger = logging.getLogger("OKExWS")
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)

okcoin = OKCoin()

okcoin.okcoin_ws.start()

# 设置api_key, secret_key并登录
from Unittest.account import get_api_key
api_key_okcoin = get_api_key("api_key_okcoin.json")
okcoin.okcoin_ws.set_api_key(api_key_okcoin["api_key"], api_key_okcoin["secret_key"])
okcoin.okcoin_ws.login()

while True:
    time.sleep(30)