# coding: utf-8
import os
import sys

_path = os.path.dirname(sys.path[0])

def get_api_key(account_file):
    import json
    try:
        file_path = os.path.join(_path, account_file)
        f = open(file_path)
        result = json.load(f)
        f.close()
        return result
    except Exception as e:
        print('{} doesnot exist, or it is not in the json form of {{\'secret_key\': \'\', \'api_key\': \'\'}}'.format(file_path))

if __name__ == "__main__":
    print(get_api_key("api_key_okcoin.json"))
    print(get_api_key("api_key_okex.json"))
