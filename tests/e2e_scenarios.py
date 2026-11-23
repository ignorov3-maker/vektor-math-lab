import asyncio, json
from datetime import datetime, timedelta
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
        await pg.goto(B+'#settings'); await pg.fill('#set-name','<img src=x onerror=window.__x=1>'); await pg.dispatch_event('#settings-form','change'); await pg.wait_for_timeout(100)
        for h in ['home','teacher','settings']:
            await pg.goto(B+'#'+h); await pg.wait_for_timeout(150)
        rep('имя с HTML не выполняется', not await pg.evaluate("window.__x===1") and await pg.locator('img[src=x]').count()==0)
        await pg.fill('#set-name','Маша'); await pg.dispatch_event('#settings-form','change'); await pg.wait_for_timeout(100)

        # 3. Новый ученик: диагностика
        await pg.goto(B+'#diagnostic'); await pg.wait_for_timeout(150)
        for k in range(6):
            a = await pg.evaluate("diagTask.task.answer")
            await answer(pg, a if k%2==0 else ('<' if a!='<' else '>') if await pg.locator('.choices').count() else '0'); await pg.wait_for_timeout(80)
        txt=await pg.inner_text('#app'); rep('диагностика: итог и рекомендации', 'Вот что мы нашли' in txt and 'Начнём с того' in txt and await pg.locator('.diag-row [data-lesson]').count() >= 1)
        await pg.click('#diag-restart'); rep('диагностика: пройти ещё раз', 'Вопрос 1 из 6' in await pg.inner_text('#app'))

        # 4. Офлайн-урок до конца, задача внутри урока
        await pg.goto(B+'#lesson/2/learn'); await pg.wait_for_timeout(200)
        for _ in range(20):
            q=pg.locator('.chat-lesson [data-quick]')
            labels=[await q.nth(k).get_attribute('data-quick') for k in range(await q.count())]
            if 'go-practice' in labels: break
            if await pg.locator('.chat-lesson .ask-tile').count():  # вопрос в уроке: ребёнок выбирает ответ плиткой
                j=await pg.evaluate("getChat(2,'lesson').ask.correct"); await pg.click(f'.chat-lesson .ask-tile[data-ask="{j}"]'); continue
            if 'solution' in labels:
                ans=await pg.evaluate("getChat(2,'lesson').pending.task.answer")
                if await pg.locator('.chat-answer .choice').count(): await pg.click(f'.chat-answer .choice[value="{ans}"]')
                else: await pg.evaluate("v => fillAnswer(v)", ans); await pg.click('.chat-answer button[type=submit]')
                continue
            await pg.click('.chat-lesson [data-quick="Дальше"]')
        rep('офлайн-урок проходится до кнопки тренировки', 'go-practice' in labels)
        rep('задача в уроке проверена кодом', 'Верно!' in await pg.text_content('.chat-lesson .chat-log'))
        rep('в уроке живые картинки и вопросы с плитками', await pg.locator('.chat-lesson .figure.scene').count()>=1 and await pg.locator('.chat-lesson .msg.user').count()>=2)
        rep('«Дальше» не засоряет переписку', 'Дальше' not in [t.strip() for t in await pg.locator('.chat-lesson .msg.user').all_inner_texts()])
        rep('правило — по пунктам', await pg.locator('.chat-lesson .rule-list li').count()>=2)
        await pg.fill('#chat-in-lesson','покажи правило'); await pg.click('.chat-lesson .chat-form button[type=submit]')
        rep('офлайн-вопрос получает ответ по конспекту', 'Правило' in (await pg.text_content('.chat-lesson .chat-log'))[-300:])
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
        rep('главная: Бипыч предлагает сначала повторить базу', 'Сначала повтори' in await pg.evaluate("bipGreeting(currentSpot())"))
        # 8. Сдать проверку и повторение
        await pg.goto(B+'#lesson/0/practice'); await pg.goto(B+'#lesson/0/check'); await pg.wait_for_timeout(100)
        for k in range(4): await answer(pg, await pg.evaluate("session.task.answer")); await pg.click('#next-task')
        rep('проверка сдана', 'Тема освоена' in await pg.inner_text('#app'))
        await pg.evaluate("state.meta['concept'].reviewDue = today(); save()"); await pg.goto(B+'#home'); await pg.wait_for_timeout(200)
        rep('повторение показано на пути и в кнопке у текущего уровня', 'Повторить' in await pg.inner_text('#path .is-current .node-bubble') and await pg.locator('.node.is-due').count()==1)
        await pg.click('#path .is-current [data-continue]', force=True); await pg.wait_for_timeout(200)
        for k in range(2): await answer(pg, await pg.evaluate("session.task.answer")); await pg.click('#next-task')
        due=await pg.evaluate("state.meta['concept'].reviewDue"); rep('повторение: следующая дата через 3 дня', due==await pg.evaluate("addDays(state.meta['concept'].masteredAt,3)"), due)
        # Д-02: повторная проверка освоенной темы звёзд не даёт
        st0=await pg.evaluate("state.game.stars"); await pg.goto(B+'#lesson/0/check'); await pg.wait_for_timeout(100)
        for k in range(4): await answer(pg, await pg.evaluate("session.task.answer")); await pg.click('#next-task')
        rep('Д-02: повторная проверка не даёт звёзд', await pg.evaluate("state.game.stars")==st0)
        # Д-01: повторение по адресу для неосвоенной темы не засчитывает тему
        await pg.goto(B+'#lesson/5/review'); await pg.wait_for_timeout(150)
        rep('Д-01: повторение неосвоенной темы закрыто', await pg.evaluate("session ? session.mode : 'none'")!='review' and await pg.evaluate("pct(5)")<100)
        # Ф-10: заглушки других разделов скрыты
        await pg.goto(B+'#map'); await pg.wait_for_timeout(150)
        # шаг «Проверь себя» открывается на каждой теме 5–9 (был белый экран: у новых тем не было check)
        bad=[]
        for i in await pg.evaluate("topics.map((t,i)=>t.course?i:-1).filter(i=>i>=0)"):
            await pg.goto(B+f'#lesson/{i}/check'); await pg.wait_for_timeout(60)
            if await pg.locator('#answer-form').count()!=1: bad.append(i)
        rep('«Проверь себя» открывается на всех темах 5–9', not bad, str(bad[:5]))
        rep('Ф-10: темы — дроби и курсы 5–9 по программе, заглушек нет', await pg.evaluate("topics.length===9+VEKTOR_KIT.topics.filter(t=>t.course).length && topics.filter(t=>t.legacy).length===0"))
        # 9. Краткие темы (без методички) — только в демо-режиме ?demo=all
        D=B+'?demo=all'
        await pg.goto(D+'#lesson/'+str(await pg.evaluate("9+VEKTOR_KIT.topics.filter(t=>t.course).length"))); await pg.wait_for_timeout(150); await answer(pg,'3'); rep('краткая тема решается', 'Верно' in await pg.inner_text('#feedback'))
        await pg.goto(D+'#lesson/'+str(await pg.evaluate("9+VEKTOR_KIT.topics.filter(t=>t.course).length"))+'/check'); rep('краткая тема не ломается на /check', await pg.locator('#answer-form').count()==1)
        # 10. Материалы → конспект открывает урок, а не тренировку
        await pg.goto(B+'#library'); await pg.click('.topic-row[data-lesson="2"]'); await pg.wait_for_timeout(200); await pg.goto(B+'#lesson/2/learn'); await pg.wait_for_timeout(200); await pg.click('.lb-tabs [data-learn-tab="notes"]'); await pg.wait_for_timeout(200)
        rep('конспект открывается из урока кнопкой в верхней строке', await pg.locator('.method').count()==1, await pg.evaluate("location.hash"))
        # 11. ИИ: подключение, стрим, ошибки, запасной режим
        await pg.goto(B+'#settings'); await pg.check('input[value=key]'); await pg.fill('#ai-key','abc'); await pg.click('#ai-form button[type=submit]')
        rep('неверный формат ключа отклоняется', 'sk-or-' in await pg.inner_text('#ai-status'))
        await pg.fill('#ai-key','-'.join(['sk', 'or', 'v1', 'fake'])); await pg.click('#ai-test'); await pg.wait_for_timeout(500)
        rep('проверка подключения', 'Работает' in await pg.inner_text('#ai-status'))
        rep('ключ не попал в адрес страницы', 'sk-or' not in pg.url)
        MOCK['mode']='reasoning400'; MOCK['calls'].clear()
        await pg.goto(B+'#lesson/6/learn'); await pg.click('[data-learn-tab=tutor]'); await pg.wait_for_timeout(300)
        rep('урок идёт по сценарию даже с ИИ: на старте ИИ не вызывается', len(MOCK['calls'])==0 and await pg.locator('.chat-lesson .msg.assistant').count()>=1)
        await pg.click('.chat-lesson [data-quick="Не понял, объясни по-другому"]'); await pg.wait_for_timeout(800)
        rep('модель без отключения рассуждений: повтор запроса', len(MOCK['calls'])==2 and MOCK['calls'][1]['reasoning'].get('enabled') is None and '<svg' in await pg.inner_html('.chat-lesson .chat-log'), str([c.get('reasoning') for c in MOCK['calls']]))
        rep('тег [[готово]] даёт кнопку тренировки', await pg.locator('[data-quick="go-practice"]').count()==1)
        MOCK['mode']='midstream'; await pg.fill('#chat-in-lesson','ещё'); await pg.click('.chat-lesson .chat-form button[type=submit]'); await pg.wait_for_timeout(2600)
        log=await pg.text_content('.chat-lesson .chat-log')
        rep('сбой ИИ: короткое пояснение, урок продолжается по конспекту', 'не отвечает' in log and not (await pg.locator('.chat-lesson .msg >> nth=-1').get_attribute('class')).endswith('error'))
        rep('сбой ИИ: подпись режима и кнопка «Попробовать снова»', 'временно недоступен' in await pg.inner_text('.chat-lesson .chat-mode') and await pg.locator('[data-retry-ai]').count()>=1)
        MOCK['mode']='empty'; await pg.click('.chat-lesson [data-retry-ai] >> nth=-1'); await pg.fill('#chat-in-lesson','ещё'); await pg.click('.chat-lesson .chat-form button[type=submit]'); await pg.wait_for_timeout(500)
        rep('пустой ответ показан понятным текстом', 'пустой' in await pg.text_content('.chat-lesson .chat-log'))
        MOCK['mode']='402'; await pg.click('.chat-lesson [data-retry-ai] >> nth=-1'); await pg.fill('#chat-in-lesson','ещё'); await pg.click('.chat-lesson .chat-form button[type=submit]'); await pg.wait_for_timeout(500)
        rep('нет денег на счёте — понятное сообщение', 'средства' in await pg.text_content('.chat-lesson .chat-log'))
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
        rep('карта новичка: лёгкий старт, дальше облака', await pg.locator('#path .node-quick.is-current').count()==1 and await pg.locator('#path .is-fog').count()==2 and await pg.locator('#path .fog-bank').count()==1)
        await pg.evaluate("() => { state.quick = Object.fromEntries(VEKTOR_QUICK.LEVELS.map(l => [l.id, {done:true, at:today(), best:5}])); state.settings.interests = []; save(); render(); }"); await pg.wait_for_timeout(200)
        r0 = await pg.evaluate("ROUTE[0]"); rep('после старта текущий уровень — первая тема программы класса', await pg.locator(f'#path .is-current [data-lesson="{r0}"]').count()==1)
        await pg.click('#path .is-current [data-continue]', force=True); await pg.wait_for_timeout(200)
        rep('«Продолжить» ведёт в урок первой темы', (await pg.evaluate("location.hash")).startswith(f'#lesson/{r0}/learn'))
        rep('шаги урока — полоска из трёх частей вверху', await pg.locator('.lesson-bar .stepper .step').count()==3 and await pg.locator('.do-now').count()==0)
        await pg.goto(B+'#lesson/0/learn'); await pg.wait_for_timeout(200)  # ввод дробью проверяем на первой теме дробей
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
        await pg.goto(B+'#map'); rep('«Все темы»: каждая тема — одна строка, нажатие открывает урок', await pg.locator('.topic-row[data-lesson]').count()>=9)
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
        rep('после нормы — кнопка «Проверить себя» в потоке страницы, задачу не закрывает (П-05)', await pg.locator('.ready-strip').count()==1 and await pg.evaluate("getComputedStyle(document.querySelector('.ready-strip')).position")=='static')
        await pg.click('.ready-strip [data-stage=check]'); await pg.wait_for_timeout(150)
        rep('кнопка ведёт на проверку', (await pg.evaluate("location.hash")).endswith('/check'))
        await pg.goto(B+'#settings'); await pg.wait_for_timeout(150)
        rep('стиль выбирается в профиле, плавающей панели нет (П-07)', await pg.locator('[data-skin-pick]').count()==4 and not await pg.is_visible('.skin-switch'))
        await pg.click('[data-skin-pick=pixel]'); await pg.goto(B+'#home'); await pg.wait_for_timeout(300)
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
        await pg.goto(B+'#settings'); await pg.select_option('#set-goal','3'); await pg.dispatch_event('#settings-form','change'); await pg.wait_for_timeout(100)
        rep('цель дня меняется в настройках', await pg.evaluate("game().goal")==3)
        # Поддержка в уроке, новая задача без подсказки и повторение на следующий день
        pilot = await b.new_page(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        pilot.on('pageerror', lambda e: errs.append(str(e)))
        await pilot.goto(B)
        await pilot.evaluate("window.pilotEvents = []; window.VEKTOR_METRIKA = { goal: (type, data) => pilotEvents.push([type, data]) }")
        expected = [('compare', 'одинаковыми долями', 'Выбрать больший знаменатель', 'Сравнить размер одной доли', '>'),
                    ('a7-proportional', 'насосо-часа', 'Проверить, что 250 ₽ больше 150 ₽', 'Сравнить 250 ₽ с 2 · 150 ₽', '320'),
                    ('s9-geom-prob', 'одномерный', '2 : 4', '4 : 16', '0,09')]
        for topic, second, wrong, right, independent in expected:
            index = await pilot.evaluate('id => byId[id]', topic)
            await pilot.goto(B + f'#lesson/{index}/learn')
            await pilot.get_by_role('button', name='Дай подсказку', exact=True).click()
            await pilot.get_by_role('button', name='Объясни иначе', exact=True).click()
            before = pilot.locator('.chat-lesson .msg.is-last')
            first_text = await before.inner_text()
            first_figure = await before.locator('.figure svg').count()
            await pilot.get_by_role('button', name='Объясни иначе', exact=True).click()
            after = pilot.locator('.chat-lesson .msg.is-last')
            second_text = await after.inner_text()
            rep('пилот: другой способ объяснения ' + topic, first_figure > 0 and first_text != second_text and second in second_text and not await overflow(pilot))
            await pilot.get_by_role('button', name='Проверь мой шаг', exact=True).click()
            await pilot.locator('.chat-answer').get_by_role('button', name=wrong, exact=True).click()
            rep('пилот: адресная подсказка после ошибки ' + topic,
                await pilot.evaluate('(id) => document.querySelector(".chat-lesson .msg.is-last").innerText.includes(VEKTOR_TUTOR_PILOT[id].step.hint)', topic))
            await pilot.locator('.chat-answer').get_by_role('button', name=right, exact=True).click()
            await pilot.get_by_role('button', name='Попробовать без подсказки', exact=True).click()
            rep('пилот: самостоятельная задача без подсказки ' + topic,
                not await pilot.get_by_role('button', name='Дай подсказку', exact=True).count())
            if independent == '>':
                await pilot.locator('.chat-answer').get_by_role('button', name='больше', exact=True).click()
            else:
                await pilot.get_by_role('textbox', name='Твой ответ — число').fill(independent)
                await pilot.locator('.chat-answer').get_by_role('button', name='Проверить').click()
            rep('пилот: записан первый результат и назначена разминка ' + topic, await pilot.evaluate(
                '([id, correct]) => state.tutorReview[id] === addDays(today(), 1) && pilotEvents.some(([type, d]) => type === "tutor_check" && d.topic === id && d.phase === "immediate" && d.ok === correct)',
                [topic, independent != '320']))
        rep('пилот: задания появляются только со следующего дня', not await pilot.evaluate('warmupPlan().some(item => item.type === "tutor")'))
        await pilot.clock.set_fixed_time(datetime.now() + timedelta(days=1))
        await pilot.reload()
        await pilot.evaluate("window.pilotEvents = []; window.VEKTOR_METRIKA = { goal: (type, data) => pilotEvents.push([type, data]) }")
        await pilot.goto(B + '#home')
        await pilot.locator('[data-warmup]').click()
        await pilot.locator('.wu-ans [data-v="<"]').click()
        await pilot.locator('[data-wu=next]').click()
        for value in ('200', '0,16'):
            await pilot.get_by_role('textbox', name='Ответ', exact=True).fill(value)
            await pilot.get_by_role('button', name='Ответить', exact=True).click()
            await pilot.locator('[data-wu=next]').click()
        rep('пилот: результаты отложенной проверки', '3 из 3' in await pilot.locator('#wu').inner_text()
            and await pilot.evaluate('Object.values(state.tutorReview).length === 3 && Object.values(state.tutorReview).every(value => value === null)')
            and await pilot.evaluate('pilotEvents.filter(([type, d]) => type === "tutor_check" && d.phase === "delayed" && d.ok).length === 3'))
        await pilot.close()
        rep('нет ошибок JavaScript', not errs, '; '.join(errs[:3]))
        await b.close()
    ok=sum(1 for r in R if r[1]); print('\nИТОГО:', ok, 'из', len(R)); sys.exit(0 if ok==len(R) else 1)
asyncio.run(main())
