import os, json, base64, time, argparse
from pathlib import Path
import requests
ROOT=Path(__file__).parent
BASE_URL=os.getenv('MIMO_BASE_URL','https://api.xiaomimimo.com/v1').rstrip('/')
API_KEY=os.getenv('MIMO_API_KEY','')
MODEL=os.getenv('MIMO_TTS_MODEL','mimo-v2.5-tts')
VOICE=os.getenv('MIMO_TTS_VOICE','冰糖')
STYLE=os.getenv('MIMO_TTS_STYLE','请用专业、自然、可信赖的企业介绍口吻，普通话，语速适中，停顿清晰，不要过度播音腔。')
if not API_KEY: raise SystemExit('请先设置环境变量 MIMO_API_KEY')
manifest=json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
parser=argparse.ArgumentParser();parser.add_argument('--page',type=int);parser.add_argument('--overwrite',action='store_true');args=parser.parse_args()
items=[x for x in manifest if args.page is None or x['page']==args.page]
out=ROOT/'shared'/'audio';out.mkdir(exist_ok=True)
headers={'Authorization':f'Bearer {API_KEY}','Content-Type':'application/json'}
for idx,x in enumerate(items,1):
    target=out/f"page-{x['page']:03d}.wav"
    if target.exists() and not args.overwrite:
        print(f"skip {x['page']:03d}");continue
    payload={'model':MODEL,'messages':[{'role':'user','content':STYLE},{'role':'assistant','content':x['narration']}],'audio':{'format':'wav','voice':VOICE}}
    r=requests.post(BASE_URL+'/chat/completions',headers=headers,json=payload,timeout=120)
    if not r.ok:
        print(f"FAIL {x['page']:03d}: {r.status_code} {r.text[:300]}");continue
    data=r.json()['choices'][0]['message']['audio']['data'];target.write_bytes(base64.b64decode(data));print(f"OK {x['page']:03d} -> {target.name}")
    time.sleep(.15)
