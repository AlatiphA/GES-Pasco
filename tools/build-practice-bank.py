"""Extract only MCQs with one clearly bold-marked answer from the bundled EPUB."""
import zipfile,xml.etree.ElementTree as E,re,json,copy
from pathlib import Path
NS={'n':'http://www.daisy.org/z3986/2005/ncx/','h':'http://www.w3.org/1999/xhtml'}
def text(el):
 el=copy.deepcopy(el)
 for p in el.iter():
  for c in list(p):
   if c.tag.endswith('}sup'):p.remove(c)
 return ' '.join(' '.join(el.itertext()).split())
with zipfile.ZipFile('library/sample.epub') as z:
 toc=E.fromstring(z.read('toc.ncx'));sections=[]
 for nav in toc.findall('.//n:navMap/n:navPoint',NS):
  title=nav.findtext('n:navLabel/n:text',namespaces=NS)
  for child in nav.findall('n:navPoint',NS):
   label=child.findtext('n:navLabel/n:text',namespaces=NS)
   if label=='Section A':sections.append((title,label,child.find('n:content',NS).get('src').split('#')[0]))
 banks=[];skipped=0
 for title,label,path in sections:
  root=E.fromstring(z.read(path));body=root.find('h:body',NS);questions=[];prompt=None;premises=[]
  for el in body:
   raw=text(el);m=re.match(r'^(\d+)\.\s+(.+)',raw)
   if el.tag.endswith('}p') and m:
    prompt=(m.group(1),m.group(2));premises=[]
   elif prompt and el.tag.endswith('}ol'):
    items=el.findall('h:li',NS);bold=[]
    for i,item in enumerate(items):
     full=text(item);strong=' '.join(text(b) for b in item.findall('.//h:b',NS))
     if len(re.sub(r'\W','',strong))>=max(2,.8*len(re.sub(r'\W','',full))):bold.append(i)
    if len(items)==4 and len(bold)==1:
     opts=[re.sub(r'^[A-D]\.\s*','',text(item)) for item in items]
     if len(set(v.lower() for v in opts))==4:
      num,q=prompt;source=f'{title}, {label}, question {num}'
      questions.append({'id':f'{Path(path).stem}-{num}-{len(questions)+1}','topic':label,'prompt':q+('\\n'+'\\n'.join(premises) if premises else ''),'options':opts,'answer':bold[0],'explanation':'The book marks “'+opts[bold[0]]+'” as the answer.','source':source})
     prompt=None;premises=[]
    elif len(items)!=4 or not bold:
     if el.get('class')=='list_1':premises.extend(f'{["I","II","III","IV","V","VI"][i]}. {text(item)}' for i,item in enumerate(items))
     else:skipped+=1;prompt=None;premises=[]
    else:skipped+=1;prompt=None;premises=[]
  if questions:
   for offset in range(0,len(questions),100):
    banks.append({'schema':1,'id':Path(path).stem.replace('_','-')+f'-{offset//100+1}','title':title+' — '+label+(f' (part {offset//100+1})' if len(questions)>100 else ''),'version':1,'questions':questions[offset:offset+100]})
 Path('practice-bank.json').write_text(json.dumps({'schema':1,'source':'library/sample.epub','answerBasis':'Only questions with one clearly bold-marked answer in the book are included. Answers follow the book, not an independent current review.','banks':banks},ensure_ascii=False,indent=2).replace('\\\\n','\\n'),encoding='utf-8')
 print(json.dumps({'banks':len(banks),'questions':sum(len(b['questions']) for b in banks),'ambiguousSkipped':skipped,'counts':[(b['title'],len(b['questions'])) for b in banks]},ensure_ascii=True))
