"""Refresh only public regular-session USD prices; never change model inputs."""
from pathlib import Path
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import json, math, os, urllib.parse, urllib.request

SYMBOLS = {'MU': 'Micron', 'SKHY': 'SK hynix', 'SNDK': 'Sandisk'}
BASELINE = datetime(2026, 10, 9, 20, tzinfo=timezone.utc).timestamp()
ROOT = Path(__file__).resolve().parent

def iso(seconds):
    return datetime.fromtimestamp(seconds, timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')

def parse_quote(symbol, payload, now):
    chart = payload['chart']
    if chart.get('error') or len(chart.get('result') or []) != 1:
        raise ValueError('Missing chart for ' + symbol)
    result = chart['result'][0]
    m = result['meta']
    if (m.get('symbol') != symbol or m.get('currency') != 'USD'
            or m.get('exchangeName') not in ['NMS', 'NGM', 'NCM']
            or m.get('instrumentType') != 'EQUITY'
            or SYMBOLS[symbol].lower() not in m.get('longName', m.get('shortName', '')).lower()):
        raise ValueError('Security identity mismatch: ' + symbol)
    price, stamp = m['regularMarketPrice'], m['regularMarketTime']
    if (isinstance(price, bool) or not isinstance(price, (int, float)) or not math.isfinite(price)
            or price <= 0 or not isinstance(stamp, (int, float)) or not BASELINE <= stamp <= now + 120):
        raise ValueError('Invalid price/time: ' + symbol)
    period = m['currentTradingPeriod']['regular']
    if stamp >= period['start']:
        valid_session = stamp <= period['end'] + 120
    else:
        # Before today's open, Yahoo can describe today's upcoming session but
        # still quote the preceding regular close. Preserve that dated close.
        local = datetime.fromtimestamp(stamp, ZoneInfo('America/New_York'))
        minute = local.hour * 60 + local.minute
        valid_session = local.weekday() < 5 and 570 <= minute <= 962
    if not valid_session:
        raise ValueError('Not a regular-session quote: ' + symbol)
    for split in result.get('events', {}).get('splits', {}).values():
        if split['date'] > BASELINE:
            raise ValueError('Split after model snapshot; review share assumptions: ' + symbol)
    return {'symbol': symbol, 'price': price, 'currency': 'USD', 'exchange': 'Nasdaq',
            'security': 'ADS' if symbol == 'SKHY' else 'common stock', 'session': 'regular',
            'asOf': iso(stamp), 'retrievedAt': iso(now),
            'sourceUrl': 'https://finance.yahoo.com/quote/' + symbol + '/'}

def collect():
    quotes = {}
    for symbol in SYMBOLS:
        now = datetime.now(timezone.utc).timestamp()
        query = urllib.parse.urlencode({'interval': '1d', 'period1': int(BASELINE - 86400),
                                       'period2': int(now + 1), 'events': 'splits'})
        req = urllib.request.Request('https://query1.finance.yahoo.com/v8/finance/chart/' + symbol + '?' + query,
                                     headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=25) as response:
            if response.status != 200:
                raise ValueError('Quote provider unavailable')
            payload = json.loads(response.read(2_000_000))
        quotes[symbol] = parse_quote(symbol, payload, datetime.now(timezone.utc).timestamp())
    return {'schema': 1, 'provider': 'Yahoo Finance',
            'generatedAt': iso(datetime.now(timezone.utc).timestamp()), 'quotes': quotes}

def update(path=ROOT / 'quotes.json'):
    fresh = collect()  # All three must validate before any file is replaced.
    if path.exists():
        old = json.loads(path.read_text())
        for symbol, quote in fresh['quotes'].items():
            if quote['asOf'] < old['quotes'][symbol]['asOf']:
                raise ValueError('Regressing timestamp: ' + symbol)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(fresh, indent=2) + '\n')
    os.replace(temp, path)
    print('Updated regular-session USD quotes:', ', '.join(fresh['quotes']))

if __name__ == '__main__':
    update()
