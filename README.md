# EasyCoins
> A python sdk wrapper for various bitcoin trading platforms.
>
> The wrappers in EasyCoins usually have high availability.
> For example, websocket auto-reconnection is implemented,
>

## Usage & API references
For detailed usage reference, I suggest you go to the `README.md` under
each sub-directory.

For example, you can find API references for OKCoin
 (which is a BitCoin Trading Platform in mainland China) in
`EasyCoins/OKCoin/README.md`

## Prerequisites:
The package is developed and tested on Python 3.5 & Ubuntu 16.04,
tested on Win10.

The following prerequisites is required

- Python 3.4+
- pip install websocket-client
- pip install requests

## Quick Start
> Note: Simply running the following code will establish a Web Socket connection
> to the OKCoin server. It subscribes the BitCoin ticker as soon as the
> connection is open. However, you probably need to set logging to see screen outputs.
>

```python
from EasyCoins import OKCoin

okcoin = OKCoin()
okcoin.okcoin_ws.start()
okcoin.okcoin_ws.subscribe_ticker("btc")
```

## Introduction for trading platforms
> - OKCoin
>   - Official API references:
>       - https://www.okcoin.cn/rest_getStarted.html
>       - https://www.okex.com/rest_getStarted.html
> - Huobi

## TODOs
 - [x] OKCoin API: Under Work
 - Huobi API
 - Bitmex


## Donation
> No. The author is so rich that he doesn't want any donation in any form ~
>
> Surprise!