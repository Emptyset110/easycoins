# OKCoin
> Website:
>
> - https://www.okcoin.cn
> - https://www.okcoin.com: Trading Digital Assets with margin.
> - https://www.okex.com: Digital Asset Exchange. 10x/20x leverage.

## Quick Start
For High Level API usage, you only need to get an instance of OKCoin.
```python
from easycoins import OKCoin

okcoin = OKCoin()
```

## Set your api_key & secret_key
A `api_key` and a `secret_key` is needed for trading-related operations.

Use
```
# set api_key for okcoin.okcoin_ws
okcoin.okcoin_ws.set_api_key(api_key, secret_key)

# set api_key for okcoin.okex_ws
okcoin.okex_ws.set_api_key(api_key, secret_key)
```

You can save them in a json file, and load them in your code.
`api_key_okcoin.json`

```
{
  "api_key": "",
  "secret_key": ""
}
```

## Design Philosophy
> Firstly, in `websocket_wrapper.py`,
> we defined a `OKWebSocketBase`, which is a sub-class of WebSocket and
> a base class for `OKExWS` and `OKCoinWS`.
>
> In `OKWebSocketBase`, a "ping/pong" mechanism is built-in according to the official documentation,
> so the connection will be kept alive.
> It is also designed to automatically reconnect as soon as the WebSocket is closed,
> as well as resuming the subscribed channels and login status.
> So the API users DO NOT NEED TO WORRY about the connection while calling methods.
>
> Some commonly used high level methods are defined in `OKWebSocketBase` such as
> `subscribe`, `request` so that even if this repository is not updated
> to be compatible with the latest official APIs, users can easily adjust
> the parameters to make things work.
>
> `OKExWS` and `OKCoinWS` are two sub-classes of `OKWebSocketBase`, corresponding
> to the WebSocket APIs for okex.com and okcoin.cn respectively.
