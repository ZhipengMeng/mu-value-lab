import copy, json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
from fetch_quotes import BASELINE, parse_quote, update

class QuoteTests(unittest.TestCase):
    def setUp(self):
        self.now=BASELINE+3600
        self.payload={'chart':{'error':None,'result':[{'meta':{'symbol':'SKHY','currency':'USD','exchangeName':'NMS','instrumentType':'EQUITY','longName':'SK hynix Inc.','regularMarketPrice':169.03,'regularMarketTime':BASELINE,'currentTradingPeriod':{'regular':{'start':BASELINE-23400,'end':BASELINE}}}}]}}
    def test_regular_usd_ads(self):
        q=parse_quote('SKHY',self.payload,self.now)
        self.assertEqual((q['price'],q['security'],q['currency']),(169.03,'ADS','USD'))
    def test_wrong_identity_or_bad_value(self):
        for key,val in [('symbol','000660.KS'),('currency','KRW'),('exchangeName','KSC'),('instrumentType','ETF'),('longName','Different company'),('regularMarketPrice',0),('regularMarketPrice',float('nan')),('regularMarketPrice',True),('regularMarketTime',BASELINE-1),('regularMarketTime',self.now+1000)]:
            with self.subTest(key=key,val=val):
                p=copy.deepcopy(self.payload);p['chart']['result'][0]['meta'][key]=val
                with self.assertRaises(ValueError):parse_quote('SKHY',p,self.now)
    def test_previous_close_before_next_session(self):
        self.payload['chart']['result'][0]['meta']['currentTradingPeriod']['regular']={'start':BASELINE+3*86400-23400,'end':BASELINE+3*86400}
        self.assertEqual(parse_quote('SKHY',self.payload,BASELINE+3*86400)['price'],169.03)
    def test_extended_hours_rejected(self):
        self.payload['chart']['result'][0]['meta']['regularMarketTime']=BASELINE+3600
        with self.assertRaises(ValueError):parse_quote('SKHY',self.payload,self.now)
    def test_corporate_split_requires_model_review(self):
        self.payload['chart']['result'][0]['events']={'splits':{'1':{'date':BASELINE+3600}}}
        with self.assertRaisesRegex(ValueError,'Split'):parse_quote('SKHY',self.payload,self.now)
    def test_partial_failure_preserves_old_file(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'quotes.json';p.write_text('{"old":"preserve"}')
            with patch('fetch_quotes.collect',side_effect=ValueError('one provider quote failed')):
                with self.assertRaises(ValueError):update(p)
            self.assertEqual(p.read_text(),'{"old":"preserve"}')
    def test_regressing_timestamp_preserves_old_file(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'quotes.json';old={'quotes':{'MU':{'asOf':'2026-10-10T20:00:00Z'}}};p.write_text(json.dumps(old))
            with patch('fetch_quotes.collect',return_value={'quotes':{'MU':{'asOf':'2026-10-09T20:00:00Z'}}}):
                with self.assertRaisesRegex(ValueError,'Regressing'):update(p)
            self.assertEqual(json.loads(p.read_text()),old)
if __name__=='__main__':unittest.main()
