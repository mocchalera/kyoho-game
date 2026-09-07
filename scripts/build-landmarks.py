"""Build bundled place data from public GSI sources; no runtime name lookups."""
from pathlib import Path
import zipfile,json,subprocess,urllib.parse,time
root=Path(__file__).resolve().parents[1]
z=zipfile.ZipFile(root/'data/gsi-mountains-20260331.zip')
g=json.loads(z.read(z.namelist()[0]))
mountains=[]
for f in g['features']:
 p=f['properties'];lon,lat=f['geometry']['coordinates']
 mountains.append({'id':'m'+str(p['連番']),'kind':'mountain','name':p['山名＜山頂名＞'],'lat':round(lat,6),'lon':round(lon,6),'height':p['標高値(m)']})
queries=['長野県松本市','長野県大町市','岐阜県高山市','富山県富山市','山梨県富士吉田市','静岡県富士宮市','山梨県甲府市','長野県茅野市','北海道旭川市','北海道帯広市','北海道利尻郡利尻富士町','岩手県盛岡市','秋田県にかほ市','群馬県沼田市','東京都八王子市','奈良県五條市','鳥取県米子市','愛媛県西条市','熊本県阿蘇市','鹿児島県霧島市','鹿児島県熊毛郡屋久島町','沖縄県国頭郡国頭村','長野県北安曇郡白馬村','長野県伊那市']
cache=root/'data/gsi-town-search.json'
raw=json.loads(cache.read_text()) if cache.exists() else {}
towns=[]
for i,q in enumerate(queries):
 if q not in raw:
  url='https://msearch.gsi.go.jp/address-search/AddressSearch?'+urllib.parse.urlencode({'q':q})
  raw[q]=json.loads(subprocess.check_output(['curl','--fail','-sS',url]));cache.write_text(json.dumps(raw,ensure_ascii=False,indent=2));time.sleep(.25)
 matches=[x for x in raw[q] if x['properties']['title']==q]
 if len(matches)!=1:raise ValueError((q,raw[q]))
 lon,lat=matches[0]['geometry']['coordinates']
 name=q
 for sep in ['県','東京都','北海道']:
  if sep in name:name=name.split(sep)[-1]
 if '郡' in name:name=name.split('郡')[-1]
 towns.append({'id':'town-'+str(i),'kind':'town','name':name,'address':q,'lat':lat,'lon':lon,'radius':.9})
print(len(mountains),'mountains',len(towns),'towns')
(root/'src/landmarks-data.js').write_text('/* GSI mountains 2026-03-31; GSI address search 2026-09-07. See SOURCES.md. */\nconst WORLD_MOUNTAINS='+json.dumps(mountains,ensure_ascii=False,separators=(',',':'))+';\nconst WORLD_TOWNS='+json.dumps(towns,ensure_ascii=False,separators=(',',':'))+';\n')
