import asyncio, json
from playwright.async_api import async_playwright
# Сценарии ученика и учителя в настоящем браузере. OpenRouter подменён — ключ не нужен.
# Запуск: pip install playwright && playwright install chromium && python tests/e2e_scenarios.py
import pathlib, sys
B=(pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
R=[]  # результаты
def rep(name, ok, extra=''): R.append((name, ok, extra)); print(('OK  ' if ok else 'FAIL'), name, extra)
def sse(text):
    out=': OPENROUTER PROCESSING\n\n'
    for k in range(0,len(text),10): out+='data: '+json.dumps({'choices':[{'delta':{'content':text[k:k+10]}}]})+'\n\n'
    return out+'data: '+json.dumps({'choices':[{'delta':{},'finish_reason':'stop'}],'usage':{'total_tokens':10}})+'\n\ndata: [DONE]\n\n'
MOCK={'mode':'ok','calls':[]}
async def handler(route):
    body=json.loads(route.request.post_data); MOCK['calls'].append(body)
    h={'Access-Control-Allow-Origin':'*'}
    m=MOCK['mode']
    if m=='reasoning400' and body.get('reasoning',{}).get('enabled') is False:
        return await route.fulfill(status=400, content_type='application/json', body=json.dumps({'error':{'message':'Reasoning is mandatory for this endpoint and cannot be disabled'}}), headers=h)
    if m=='midstream':
        return await route.fulfill(status=200, content_type='text/event-stream', body='data: '+json.dumps({'error':{'code':502,'message':'upstream'},'choices':[{'finish_reason':'error'}]})+'\n\n', headers=h)
    if m=='empty':
        return await route.fulfill(status=200, content_type='text/event-stream', body='data: [DONE]\n\n', headers=h)
    if m=='402':
        return await route.fulfill(status=402, content_type='application/json', body=json.dumps({'error':{'message':'Insufficient credits'}}), headers=h)
    await route.fulfill(status=200, content_type='text/event-stream', body=sse('Хорошо! Посмотри: [[круг 3/8]] Сколько кусков осталось? [[готово]]'), headers=h)
async def answer(pg, val):
    if await pg.locator('.choices').count(): await pg.click(f'.choice[value="{val}"]')
    else: await pg.evaluate("v => fillAnswer(v)", val); await pg.click('form.answer button[type=submit]')
async def overflow(pg): return await pg.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':1280,'height':860}); pg=await ctx.new_page()
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.route('https://openrouter.ai/**', handler)

        # 1. Испорченные данные в браузере
        await pg.goto(B); await pg.evaluate("localStorage.setItem('vektor-progress-v3', JSON.stringify({attempts:'x', meta:[], settings:null, diag:{step:'a'}, days:5}))"); await pg.reload(); await pg.wait_for_timeout(300)
        rep('испорченный localStorage не ломает главную', await pg.locator('h1').count()==1 and not errs, await pg.inner_text('h1'))
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(200)

        # 2. XSS через имя
        await pg.goto(B+'#settings'); await pg.fill('#set-name','<img src=x onerror=window.__x=1>'); await pg.click('#settings-form button[type=submit]')
        for h in ['home','teacher','settings']:
            await pg.goto(B+'#'+h); await pg.wait_for_timeout(150)
        rep('имя с HTML не выполняется', not await pg.evaluate("window.__x===1") and await pg.locator('img[src=x]').count()==0)
        await pg.fill('#set-name','Маша'); await pg.click('#settings-form button[type=submit]')

        # 3. Новый ученик: диагностика
        await pg.goto(B+'#diagnostic'); await pg.wait_for_timeout(150)
        for k in range(6):
            a = await pg.evaluate("diagTask.task.answer")
            await answer(pg, a if k%2==0 else ('<' if a!='<' else '>') if await pg.locator('.choices').count() else '0'); await pg.wait_for_timeout(80)
        txt=await pg.inner_text('#app'); rep('диагностика: итог и рекомендации', 'Диагностика пройдена' in txt and 'С этого стоит начать' in txt)
        await pg.click('#diag-restart'); rep('диагностика: пройти ещё раз', 'Вопрос 1 из 6' in await pg.inner_text('#app'))

        # 4. Офлайн-урок до конца, задача внутри урока
        await pg.goto(B+'#lesson/2/learn'); await pg.wait_for_timeout(200)
        for _ in range(20):
            q=pg.locator('.chat-lesson [data-quick]')
            labels=[await q.nth(k).get_attribute('data-quick') for k in range(await q.count())]
            if 'go-practice' in labels: break
            if 'solution' in labels:
                ans=await pg.evaluate("getChat(2,'lesson').pending.task.answer")
                if await pg.locator('.chat-answer .choice').count(): await pg.click(f'.chat-answer .choice[value="{ans}"]')
                else: await pg.evaluate("v => fillAnswer(v)", ans); await pg.click('.chat-answer button[type=submit]')
                continue
            await pg.click('.chat-lesson [data-quick="Дальше"]')
        rep('офлайн-урок проходится до кнопки тренировки', 'go-practice' in labels)
        rep('задача в уроке проверена кодом', 'Верно!' in await pg.inner_text('.chat-lesson .chat-log'))
        rep('«Дальше» не засоряет переписку', 'Дальше' not in [t.strip() for t in await pg.locator('.chat-lesson .msg.user').all_inner_texts()])
        rep('правило — по пунктам', await pg.locator('.chat-lesson .rule-list li').count()>=2)
        await pg.fill('#chat-in-lesson','покажи правило'); await pg.click('.chat-lesson .chat-form button')
        rep('офлайн-вопрос получает ответ по конспекту', 'Правило' in (await pg.inner_text('.chat-lesson .chat-log'))[-300:])
        await pg.click('[data-learn-tab=notes]'); rep('вкладка «Конспект»', await pg.locator('.method .rule').count()==1)
        await pg.click('.lab [data-act="k+"] >> nth=0'); rep('лаборатория: равные дроби', '=' in await pg.inner_text('.lab-big >> nth=0'))
        await pg.click('[data-learn-tab=tutor]'); rep('переписка сохраняется при смене вкладки', await pg.locator('.chat-lesson .msg').count()>5)

        # 5. Тренировка: подсказки из чата и панели не повторяются
        await pg.click('[data-quick="go-practice"]'); await pg.wait_for_timeout(200)
        await pg.click('#hint-btn'); await pg.click('.chat-task [data-quick="Дай подсказку"]'); await pg.wait_for_timeout(100)
        h1=await pg.evaluate("session.task.hints[0]"); h2=await pg.evaluate("session.task.hints[1]")
        chat=await pg.inner_text('.chat-task .chat-log'); rep('подсказка в чате — следующая, а не повтор', await pg.evaluate("session.hints")==2 and await pg.locator('#hints .bubble').count()==2)
        # 6. Темп: быстрые чистые ответы → уровень вверх, быстрый путь к проверке
        lv0=None
        for _ in range(3):
            if await pg.locator('#next-task').count(): await pg.click('#next-task')
            if lv0 is None and await pg.locator('#next-task').count()==0: lv0=await pg.evaluate("meta(2).level")
            await answer(pg, await pg.evaluate("session.task.answer")); await pg.wait_for_timeout(60)
        lv=await pg.evaluate("meta(2).level"); rep('уровень растёт после чистых решений', lv>lv0, f'{lv0}->{lv}, темп={await pg.evaluate("pace()")}')
        # 7. Проверка: провалить дважды → совет вернуться к базе
        for attempt in range(2):
            await pg.goto(B+'#lesson/2/check'); await pg.evaluate("session=null"); await pg.goto(B+'#lesson/2/practice'); await pg.goto(B+'#lesson/2/check'); await pg.wait_for_timeout(100)
            for k in range(4):
                await answer(pg, '=' if await pg.locator('.choices').count() and await pg.evaluate("session.task.answer")!='=' else ('<' if await pg.locator('.choices').count() else '0')); await pg.click('#next-task')
        txt=await pg.inner_text('#app'); rep('после двух провалов — совет повторить базовую тему', 'освежить' in txt, txt[:0])
        await pg.goto(B+'#home'); await pg.wait_for_timeout(200)
        rep('главная предлагает сначала повторить', 'Сначала повторим' in await pg.inner_text('.hero-next'))
        # 8. Сдать проверку и повторение
        await pg.goto(B+'#lesson/0/practice'); await pg.goto(B+'#lesson/0/check'); await pg.wait_for_timeout(100)
        for k in range(4): await answer(pg, await pg.evaluate("session.task.answer")); await pg.click('#next-task')
        rep('проверка сдана', 'Тема освоена' in await pg.inner_text('#app'))
        await pg.evaluate("state.meta['concept'].reviewDue = today(); save()"); await pg.goto(B+'#home'); await pg.wait_for_timeout(200)
        rep('повторение показано на пути и в «Продолжить»', 'Повторение' in await pg.inner_text('.hero-next') and await pg.locator('.node.is-due').count()==1)
        await pg.click('.hero-next [data-continue]'); await pg.wait_for_timeout(200)
        for k in range(2): await answer(pg, await pg.evaluate("session.task.answer")); await pg.click('#next-task')
        due=await pg.evaluate("state.meta['concept'].reviewDue"); rep('повторение: следующая дата через 3 дня', due==await pg.evaluate("addDays(state.meta['concept'].masteredAt,3)"), due)
        # 9. Краткие темы (без методички)
        await pg.goto(B+'#lesson/9'); await pg.wait_for_timeout(100); await answer(pg,'3'); rep('краткая тема решается', 'Верно' in await pg.inner_text('#feedback'))
        await pg.goto(B+'#lesson/9/check'); rep('краткая тема не ломается на /check', await pg.locator('#answer-form').count()==1)
        # 10. Материалы → конспект открывает урок, а не тренировку
        await pg.goto(B+'#library'); await pg.click('[data-lesson="2"][data-tab="notes"]'); await pg.wait_for_timeout(200)
        rep('«Открыть конспект» ведёт в конспект', await pg.locator('.method').count()==1, await pg.evaluate("location.hash"))
        # 11. ИИ: подключение, стрим, ошибки, запасной режим
        await pg.goto(B+'#settings'); await pg.check('input[value=key]'); await pg.fill('#ai-key','abc'); await pg.click('#ai-form button[type=submit]')
        rep('неверный формат ключа отклоняется', 'sk-or-' in await pg.inner_text('#ai-status'))
        await pg.fill('#ai-key','sk-or-v1-fake'); await pg.click('#ai-test'); await pg.wait_for_timeout(500)
        rep('проверка подключения', 'Работает' in await pg.inner_text('#ai-status'))
        rep('ключ не попал в адрес страницы', 'sk-or' not in pg.url)
        MOCK['mode']='reasoning400'; MOCK['calls'].clear()
        await pg.goto(B+'#lesson/6/learn'); await pg.click('[data-learn-tab=tutor]'); await pg.wait_for_timeout(800)
        rep('модель без отключения рассуждений: повтор запроса', len(MOCK['calls'])==2 and MOCK['calls'][1]['reasoning'].get('enabled') is None and '<svg' in await pg.inner_html('.chat-lesson .chat-log'), str([c.get('reasoning') for c in MOCK['calls']]))
        rep('тег [[готово]] даёт кнопку тренировки', await pg.locator('[data-quick="go-practice"]').count()==1)
        MOCK['mode']='midstream'; await pg.fill('#chat-in-lesson','ещё'); await pg.click('.chat-lesson .chat-form button'); await pg.wait_for_timeout(2600)
        log=await pg.inner_text('.chat-lesson .chat-log')
        rep('сбой ИИ: короткое пояснение, урок продолжается по конспекту', 'не отвечает' in log and not (await pg.locator('.chat-lesson .msg >> nth=-1').get_attribute('class')).endswith('error'))
        rep('сбой ИИ: подпись режима и кнопка «Попробовать снова»', 'временно недоступен' in await pg.inner_text('.chat-lesson .chat-mode') and await pg.locator('[data-retry-ai]').count()>=1)
        MOCK['mode']='empty'; await pg.click('.chat-lesson [data-retry-ai] >> nth=-1'); await pg.fill('#chat-in-lesson','ещё'); await pg.click('.chat-lesson .chat-form button'); await pg.wait_for_timeout(500)
        rep('пустой ответ показан понятным текстом', 'пустой' in await pg.inner_text('.chat-lesson .chat-log'))
        MOCK['mode']='402'; await pg.click('.chat-lesson [data-retry-ai] >> nth=-1'); await pg.fill('#chat-in-lesson','ещё'); await pg.click('.chat-lesson .chat-form button'); await pg.wait_for_timeout(500)
        rep('нет денег на счёте — понятное сообщение', 'средства' in await pg.inner_text('.chat-lesson .chat-log'))
        hist=MOCK['calls'][-1]['messages']; rep('ошибки не уходят в историю для модели', all('средства' not in (m.get('content') or '') for m in hist))
        MOCK['mode']='ok'
        await pg.goto(B+'#settings'); await pg.click('#ai-forget'); rep('ключ удаляется', await pg.evaluate("JSON.parse(localStorage.getItem('vektor-ai')).key")=='')
        # 12. Сброс
        await pg.click('#reset'); await pg.click('#reset'); await pg.wait_for_timeout(200)
        rep('сброс прогресса', await pg.evaluate("state.answers")==0 and await pg.evaluate("location.hash")=='#home')
        # 13. Все страницы во всех стилях на телефоне без горизонтальной прокрутки
        m=await b.new_page(viewport={'width':375,'height':760}); await m.route('https://openrouter.ai/**', handler)
        bad=[]
        for skin in ['notebook','orbit','pop','pixel']:
            for h in ['home','map','diagnostic','awards','teacher','settings','lesson/0/learn','lesson/4/practice','lesson/5/check','lesson/5/practice']:
                await m.goto(B+'#'+h); await m.evaluate(f"setSkin('{skin}')"); await m.wait_for_timeout(120)
                if await overflow(m): bad.append(f'{skin}:{h}')
        rep('нет горизонтальной прокрутки на телефоне', not bad, ','.join(bad[:6]))
        # 14. Клавиатура: ответ по Enter
        await pg.goto(B+'#lesson/1/practice'); await pg.wait_for_timeout(150)
        await pg.evaluate("v => fillAnswer(v)", await pg.evaluate("session.task.answer")); await pg.press('#ans-num','Enter')
        rep('ответ отправляется клавишей Enter', 'Верно' in await pg.inner_text('#feedback'))
        # 14b. Удобство: путь, «Продолжить», шаги, клеточки дроби
        await pg.goto(B); await pg.evaluate("localStorage.removeItem('vektor-progress-v3')"); await pg.reload(); await pg.wait_for_timeout(300)
        rep('путь из 9 тем + финиш', await pg.locator('#path .node').count()==10)
        await pg.click('.hero-next [data-continue]'); await pg.wait_for_timeout(200)
        rep('«Продолжить» ведёт в урок первой темы', (await pg.evaluate("location.hash")).startswith('#lesson/0/learn'))
        rep('шаги урока и «что делать сейчас»', await pg.locator('.stepper .step').count()==3 and await pg.locator('.do-now').count()==1)
        await pg.click('.stepper [data-stage=practice]'); await pg.wait_for_timeout(150)
        await pg.fill('#ans-num','3'); await pg.press('#ans-num','/'); await pg.keyboard.type('5')
        rep('«/» переносит курсор в знаменатель', await pg.input_value('#ans-den')=='5')
        await pg.fill('#ans-num',''); await pg.click('form.answer button[type=submit]')
        rep('пустые клеточки — понятная подсказка', 'клеточки' in await pg.inner_text('#feedback') or 'верхнее' in await pg.inner_text('#feedback'))
        await pg.click('#hint-btn'); rep('подсказка под задачей со счётчиком', await pg.locator('#hints .bubble').count()==1 and '(' in await pg.inner_text('#hint-btn'))
        await pg.evaluate("v => fillAnswer(v)", '1/97'); await pg.click('form.answer button[type=submit]')
        rep('неверный ответ: кнопка «Исправить ответ»', await pg.locator('#try-again').count()==1)
        await pg.click('#try-again'); rep('«Исправить ответ» ставит курсор в клеточку', await pg.evaluate("document.activeElement.id")=='ans-num')
        await pg.click('.back'); rep('«← К пути» возвращает на главную', (await pg.evaluate("location.hash"))=='#home')
        await pg.goto(B+'#map'); rep('«Все темы»: кнопки Урок и Конспект', await pg.locator('.topic-actions .btn').count()>=17)
        rep('меню из 4 пунктов', await pg.locator('nav [data-page]').count()==4)
        await pg.goto(B+'#lesson/0/practice'); await pg.wait_for_timeout(150)
        rep('обычная дробь: клеточки «целые» нет', await pg.locator('.fi-whole').count()==0 and await pg.locator('[data-whole]').count()==0)
        mixed_ok = await pg.evaluate("(() => { const d=document.createElement('form'); d.className='answer'; d.innerHTML=answerInput({answer:'2 1/3',accept:'mixed'},'Проверить'); app.appendChild(d); const w=d.querySelector('.fi-whole'); const ok=!!w && getComputedStyle(w).display!=='none'; d.remove(); return ok; })()")
        rep('смешанное число: клеточка «целые» видна', mixed_ok)
        await pg.goto(B+'#home'); await pg.goto(B+'#lesson/3/practice'); await pg.wait_for_timeout(150)
        seen_ms = False
        for _ in range(6):
            await pg.evaluate("fillAnswer(session.task.answer)"); await pg.click('form.answer button[type=submit]'); await pg.wait_for_timeout(150)
            if await pg.locator('#feedback .milestone').count(): seen_ms = True; break
            await pg.click('#next-task'); await pg.wait_for_timeout(120)
        rep('после нормы — «Тренировка пройдена» и путь к проверке', seen_ms and await pg.locator('#feedback [data-stage-now=check]').count()==1)
        await pg.click('#next-task'); await pg.wait_for_timeout(150)
        rep('после нормы внизу закреплена кнопка «Проверить себя»', await pg.locator('.ready-strip').count()==1 and await pg.evaluate("getComputedStyle(document.querySelector('.ready-strip')).position")=='sticky')
        await pg.click('.ready-strip [data-stage=check]'); await pg.wait_for_timeout(150)
        rep('кнопка ведёт на проверку', (await pg.evaluate("location.hash")).endswith('/check'))
        await pg.evaluate("setSkin('pixel')"); await pg.goto(B+'#home'); await pg.wait_for_timeout(300)
        rep('стиль «Пиксель» включается', await pg.evaluate("document.documentElement.dataset.skin")=='pixel')
        await pg.evaluate("setSkin('notebook')")
        # 15. Геймификация
        await pg.goto(B); await pg.evaluate("localStorage.removeItem('vektor-progress-v3')"); await pg.reload(); await pg.wait_for_timeout(200)
        await pg.goto(B+'#lesson/1/practice'); await pg.wait_for_timeout(150)
        await answer(pg, await pg.evaluate("session.task.answer")); await pg.wait_for_timeout(150)
        rep('звёзды за задачу и счётчик в шапке', await pg.inner_text('#hud-stars')=='3' and await pg.locator('.toast').count()>=1)
        await pg.goto(B+'#awards'); await pg.wait_for_timeout(150)
        rep('экран наград: звание и достижение', 'Новичок' in await pg.inner_text('#app') and await pg.locator('.badge-card.on').count()==1)
        await pg.goto(B+'#home'); await pg.wait_for_timeout(200)
        rep('цель дня на главной', '1/5' in (await pg.inner_text('.goal-ring')).replace('\n',''))
        await pg.goto(B+'#settings'); await pg.select_option('#set-goal','3'); await pg.click('#settings-form button[type=submit]')
        rep('цель дня меняется в настройках', await pg.evaluate("game().goal")==3)
        rep('нет ошибок JavaScript', not errs, '; '.join(errs[:3]))
        await b.close()
    ok=sum(1 for r in R if r[1]); print('\nИТОГО:', ok, 'из', len(R)); sys.exit(0 if ok==len(R) else 1)
asyncio.run(main())
