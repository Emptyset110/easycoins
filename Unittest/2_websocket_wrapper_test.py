# coding: utf-8
import sys
import os
sys.path.append(os.path.dirname(sys.path[0]))
# 将到上一层路径加入sys.path以便正常测试import

from EasyCoins import OKCoin, OKCoinWS
import time
import logging

"""
将logging设置为DEBUG，用于调试，生产环境可以设置为INFO甚至WARNING

logging是可以全局设置的类
"""
# 设置屏幕输出句柄
formatter = logging.Formatter(
    '[%(levelname)s] %(asctime)s - %(name)s - %(lineno)d - %(message)s'
)
logger = logging.getLogger("OKCoinWS")
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setFormatter(formatter)
logger.addHandler(handler)

"""
实例化OKCoinWS类，它是OKWebSocketBase的子类
"""
okcoin_ws = OKCoinWS()
okcoin_ws.start()

# 设置api_key, secret_key并登录
from Unittest.account import get_api_key
api_key_okcoin = get_api_key("api_key_okcoin.json")
okcoin_ws.set_api_key(api_key_okcoin["api_key"], api_key_okcoin["secret_key"])
okcoin_ws.login()


# # 测试重复订阅
# okcoin_ws.subscribe_depth("btc")    # 相当于okcoin_ws.subscribe("ok_sub_spotcny_btc_depth")
# okcoin_ws.subscribe_depth("btc")    # 重复订阅这个接口会收到两次全息推送，但是之后推送的变化盘口不会有重复
# time.sleep(2)
# okcoin_ws.unsubscribe("ok_sub_spotcny_btc_depth")   # 只需要removeChannel一次即可取消订阅

# time.sleep(15)
# okcoin_ws.close()                   # 测试断线后恢复订阅登录状态

# 下单接口
# okcoin_ws.trade(trade_action="sell", symbol="btc_cny", amount="20000", volume="0.0199")
# okcoin_ws.cancel_order(symbol="btc_cny", order_id="8947482356")
# okcoin_ws.cancel_order(symbol="btc_cny", order_id="8947547979")

# 查询订单信息
okcoin_ws.get_order_info(symbol="btc_cny", order_id="8947547979")

# 查询用户信息
okcoin_ws.get_user_info()

while True:
    time.sleep(10)