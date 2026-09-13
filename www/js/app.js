(function(){

  /* ---------- STORAGE ---------- */
  const STORE_PRACTICE = 'bs_practice_stats';
  const STORE_EXAM = 'bs_exam_history';
  let memFallback = {};
  function storeGet(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return memFallback[key] !== undefined ? memFallback[key] : fallback; }
  }
  function storeSet(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }
    catch(e){ memFallback[key] = value; }
  }
  function getPracticeStats(){ return storeGet(STORE_PRACTICE, {}); }
  function recordPracticeAnswer(lectureId, isCorrect){
    const stats = getPracticeStats();
    const key = String(lectureId||'mixed');
    if(!stats[key]) stats[key] = { attempted:0, correct:0 };
    stats[key].attempted++;
    if(isCorrect) stats[key].correct++;
    storeSet(STORE_PRACTICE, stats);
  }
  function getExamHistory(){ return storeGet(STORE_EXAM, []); }
  function saveExamResult(record){
    const hist = getExamHistory();
    hist.unshift(record);
    storeSet(STORE_EXAM, hist.slice(0,50));
  }

  /* ---------- NAVIGATION ---------- */
  const SCREEN_IDS = ['home','lectures','theory','mcq-picker','mcq','short','timeline','exam','exam-session','exam-result','stats'];
  function showScreen(name){
    SCREEN_IDS.forEach(id=>{
      const el = document.getElementById('screen-'+id);
      if(el) el.classList.toggle('active', id===name);
    });
    if(name==='home') renderHomeStats();
    window.scrollTo(0,0);
  }
  function navigateTo(name){
    const cur = SCREEN_IDS.find(id=>{
      const el = document.getElementById('screen-'+id);
      return el && el.classList.contains('active');
    });
    if(cur !== name) history.pushState({screen:name}, '', '#'+name);
    showScreen(name);
  }
  window.addEventListener('popstate', (e)=>{
    const overlay = document.getElementById('orbit-overlay');
    if(overlay.classList.contains('active')){
      overlay.classList.remove('active');
      return;
    }
    const target = (e.state && e.state.screen) || 'home';
    showScreen(target);
  });
  history.replaceState({screen:'home'}, '', '#home');
  document.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const target = el.dataset.nav;
      if(target==='lectures') renderLectureList();
      if(target==='mcq-picker') renderPickerList('mcq-picker-list', l=>totalMcq(l)>0, openMcqLecture, 'MCQ');
      if(target==='short') renderAllShortQuestions();
      if(target==='timeline') renderTimeline();
      if(target==='exam') renderExamPicker();
      if(target==='stats') renderStats();
      navigateTo(target);
    });
  });
  document.querySelectorAll('[data-back]').forEach(el=>{
    el.addEventListener('click', ()=> history.back());
  });

  function totalMcq(lecture){
    return (lecture.mcqSets||[]).reduce((sum,s)=>sum+s.questions.length,0);
  }

  /* ---------- HOME STATS ---------- */
  function renderHomeStats(){
    const doneLectures = LECTURES.filter(l=>l.theoryFacts.length>0 || totalMcq(l)>0).length;
    const pStats = getPracticeStats();
    const totalAttempted = Object.values(pStats).reduce((s,v)=>s+v.attempted,0);
    const examCount = getExamHistory().length;
    document.getElementById('stat-lectures').textContent = toBn(doneLectures);
    document.getElementById('stat-mcq').textContent = toBn(totalAttempted);
    document.getElementById('stat-exam').textContent = toBn(examCount);
  }
  const bnDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  function toBn(n){ return String(n).split('').map(c=> /\d/.test(c) ? bnDigits[c] : c).join(''); }

  /* ---------- LECTURE LIST ---------- */
  function renderLectureList(){
    const wrap = document.getElementById('lecture-list');
    wrap.innerHTML = LECTURES.map(l=>{
      const tCount = l.theoryTables.length;
      const status = tCount>0 ? (toBn(tCount)+' টি টেবিল/নোট') : 'শীঘ্রই যুক্ত হবে';
      return `<div class="list-item" data-open-lecture="${l.id}">
        <div class="li-num">${toBn(l.id)}</div>
        <div class="li-main">
          <div class="li-title">${l.title}</div>
          <div class="li-sub">${l.era} · ${status}</div>
        </div>
        <div class="li-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
        </div>
      </div>`;
    }).join('');
    wrap.querySelectorAll('[data-open-lecture]').forEach(el=>{
      el.addEventListener('click', ()=>{
        const lecture = LECTURES.find(l=>l.id==el.dataset.openLecture);
        if(!lecture) return;
        if(lecture.theoryTables.length===0 && lecture.essayNotes.length===0){
          alert('এই লেকচারের ডেটা শীঘ্রই যুক্ত হবে।');
          return;
        }
        openTheory(lecture);
      });
    });
  }

  function renderPickerList(containerId, filterFn, openFn, kind){
    const wrap = document.getElementById(containerId);
    const items = LECTURES.filter(filterFn);
    if(items.length===0){
      wrap.innerHTML = '<div class="empty-state">এখনো কোনো '+kind+' যুক্ত হয়নি</div>';
      return;
    }
    wrap.innerHTML = items.map(l=>{
      const sub = toBn(totalMcq(l))+' টি প্রশ্ন';
      return `<div class="list-item" data-open-lecture="${l.id}">
        <div class="li-num">${toBn(l.id)}</div>
        <div class="li-main">
          <div class="li-title">${l.title}</div>
          <div class="li-sub">${sub}</div>
        </div>
        <div class="li-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
        </div>
      </div>`;
    }).join('');
    wrap.querySelectorAll('[data-open-lecture]').forEach(el=>{
      el.addEventListener('click', ()=>{
        const lecture = LECTURES.find(l=>l.id==el.dataset.openLecture);
        openFn(lecture);
      });
    });
  }

  /* ---------- THEORY (reference tables / essays / verses only — no short Q&A, no MCQ) ---------- */
  function openTheory(lecture){
    document.getElementById('theory-eyebrow').textContent = 'লেকচার '+toBn(lecture.id)+' · '+lecture.era;
    const body = document.getElementById('theory-body');
    let html = '';
    (lecture.theoryTables||[]).forEach(t=>{
      html += `<div class="table-title">${t.title}</div><div class="table-card">`;
      t.rows.forEach((r,i)=>{
        const cells = r.map((cell,ci)=>`<div class="c${ci+1}">${cell}</div>`).join('');
        html += `<div class="table-row ${i===0?'head':''}">${cells}</div>`;
      });
      html += `</div>`;
    });
    if((lecture.versesWithMeaning||[]).length){
      html += `<div class="table-title">চর্যাপদের কিছু পদ ও অর্থ</div>`;
      lecture.versesWithMeaning.forEach(v=>{
        html += `<div class="fact-card"><div class="fact-q" style="font-style:italic">${v.verse}</div><div class="fact-a"><b>অর্থ:</b> ${v.meaning}</div></div>`;
      });
    }
    (lecture.essayNotes||[]).forEach(e=>{
      html += `<div class="table-title">${e.title}</div><div class="essay-card">${e.body.replace(/\n/g,'<br><br>')}</div>`;
    });
    body.innerHTML = html || '<div class="empty-state">এই লেকচারের থিওরি নোট শীঘ্রই যুক্ত হবে</div>';
    navigateTo('theory');
  }

  /* ---------- SHORT QUESTIONS (all lectures combined, one-line Q&A) ---------- */
  function renderAllShortQuestions(){
    const body = document.getElementById('short-body');
    let html = '';
    LECTURES.forEach(l=>{
      if(!l.theoryFacts || l.theoryFacts.length===0) return;
      html += `<div class="table-title">লেকচার ${toBn(l.id)} — ${l.title}</div>`;
      l.theoryFacts.forEach(f=>{
        html += `<div class="fact-card"><div class="fact-q">${f.q}</div><div class="fact-a">${f.a}</div></div>`;
      });
    });
    body.innerHTML = html || '<div class="empty-state">এখনো কোনো সংক্ষিপ্ত প্রশ্ন যুক্ত হয়নি</div>';
  }

  /* ---------- MCQ PRACTICE ---------- */
  let currentQuiz = [];
  let currentIndex = 0;
  let currentLectureTitle = '';
  let currentLectureId = null;

  function openMcqLecture(lecture){
    currentQuiz = [];
    (lecture.mcqSets||[]).forEach(set=>{
      set.questions.forEach(q=> currentQuiz.push(Object.assign({setName:set.name}, q)));
    });
    currentIndex = 0;
    currentLectureTitle = lecture.title;
    currentLectureId = lecture.id;
    document.getElementById('mcq-eyebrow').textContent = 'লেকচার '+toBn(lecture.id);
    if(currentQuiz.length===0){ alert('এই লেকচারের MCQ শীঘ্রই যুক্ত হবে।'); return; }
    navigateTo('mcq');
    renderQuestion();
  }

  function renderQuestion(){
    const q = currentQuiz[currentIndex];
    document.getElementById('mcq-progress-label').textContent = toBn(currentIndex+1)+'/'+toBn(currentQuiz.length);
    document.getElementById('mcq-progress-fill').style.width = ((currentIndex+1)/currentQuiz.length*100)+'%';
    document.getElementById('mcq-qnum').textContent = 'প্রশ্ন '+toBn(currentIndex+1)+(q.tag?' · '+q.tag:'');
    document.getElementById('mcq-qtext').textContent = q.q;
    const letters = ['ক','খ','গ','ঘ'];
    const optWrap = document.getElementById('mcq-options');
    optWrap.innerHTML = q.options.map((opt,i)=>
      `<div class="option" data-i="${i}"><div class="letter">${letters[i]}</div><div>${opt}</div></div>`
    ).join('');
    document.getElementById('mcq-explain').style.display = 'none';
    document.getElementById('mcq-next').style.display = 'none';

    optWrap.querySelectorAll('.option').forEach(opt=>{
      opt.addEventListener('click', ()=>{
        const chosen = parseInt(opt.dataset.i);
        recordPracticeAnswer(currentLectureId, chosen===q.answer);
        optWrap.querySelectorAll('.option').forEach(o=>o.classList.add('disabled'));
        optWrap.querySelectorAll('.option').forEach((o,i)=>{
          if(i===q.answer) o.classList.add('correct');
          else if(i===chosen) o.classList.add('wrong');
        });
        const explainEl = document.getElementById('mcq-explain');
        explainEl.style.display = 'block';
        explainEl.innerHTML = '<b>সঠিক উত্তর: '+letters[q.answer]+'</b> — '+q.options[q.answer];
        document.getElementById('mcq-next').style.display = (currentIndex<currentQuiz.length-1) ? 'block' : 'none';
      }, { once:true });
    });
  }
  document.getElementById('mcq-next').addEventListener('click', ()=>{
    currentIndex++;
    if(currentIndex<currentQuiz.length) renderQuestion();
  });

  /* ---------- TIMELINE ---------- */
  function renderTimeline(){
    const wrap = document.getElementById('timeline-list');
    const sorted = [...TIMELINE].sort((a,b)=>a.year-b.year);
    wrap.innerHTML = sorted.map((t,idx)=>{
      const isEra = t.era.indexOf('যুগ')>-1 && t.title.indexOf('শুরু')>-1;
      return `<div class="tl-item ${isEra?'era':''}" data-idx="${idx}">
        <div class="tl-year-circle">${toBn(t.year)}</div>
        <div class="tl-info">
          <div class="tl-era">${t.era}</div>
          <div class="tl-title">${t.title}</div>
          <div class="tl-count">${toBn(t.facts.length)} টি তথ্য</div>
        </div>
      </div>`;
    }).join('');
    wrap.dataset.sorted = 'ready';
    wrap._sortedData = sorted;
    wrap.querySelectorAll('.tl-item').forEach(el=>{
      el.addEventListener('click', ()=> openOrbit(sorted[parseInt(el.dataset.idx)]));
    });
  }

  const overlay = document.getElementById('orbit-overlay');
  const stage = document.getElementById('orbit-stage');
  const centerEl = document.getElementById('orbit-center');
  const linesEl = document.getElementById('orbit-lines');

  function openOrbit(item){
    centerEl.textContent = toBn(item.year);
    document.querySelectorAll('.orbit-chip').forEach(c=>c.remove());
    linesEl.innerHTML = '';

    const W = 340, H = 460, cx = W/2, cy = H/2, radius = 148;
    const n = item.facts.length;
    linesEl.setAttribute('viewBox', `0 0 ${W} ${H}`);

    centerEl.style.transition = 'none';
    centerEl.style.transform = 'translate(-50%,-50%) scale(0.3)';

    const built = [];
    item.facts.forEach((fact,i)=>{
      const angle = (2*Math.PI*i/n) - Math.PI/2;
      const x = cx + radius*Math.cos(angle);
      const y = cy + radius*Math.sin(angle);

      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', cx); line.setAttribute('y2', cy);
      line.setAttribute('stroke', 'rgba(184,134,11,0.5)');
      line.setAttribute('stroke-width', '1.5');
      linesEl.appendChild(line);

      const chip = document.createElement('div');
      chip.className = 'orbit-chip';
      chip.style.left = cx+'px';
      chip.style.top = cy+'px';
      chip.style.transform = 'translate(-50%,-50%) scale(0.15)';
      chip.style.opacity = '0';
      chip.textContent = fact;
      stage.appendChild(chip);
      built.push({chip, line, x, y});
    });

    history.pushState({orbitOpen:true}, '', '#orbit');
    overlay.classList.add('active');

    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        centerEl.style.transition = 'transform .45s cubic-bezier(.34,1.56,.64,1)';
        centerEl.style.transform = 'translate(-50%,-50%) scale(1)';
        built.forEach(({chip,line,x,y}, i)=>{
          setTimeout(()=>{
            chip.style.left = x+'px';
            chip.style.top = y+'px';
            chip.style.transform = 'translate(-50%,-50%) scale(1)';
            chip.style.opacity = '1';
            line.setAttribute('x2', x);
            line.setAttribute('y2', y);
          }, 90 + i*70);
        });
      });
    });
  }
  document.getElementById('orbit-close').addEventListener('click', ()=> history.back());
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) history.back(); });

  /* ---------- EXAM PICKER ---------- */
  let examSelectedLectures = new Set();
  let examSelectedCount = 25;

  function renderExamPicker(){
    const wrap = document.getElementById('exam-lecture-chips');
    if(examSelectedLectures.size===0){
      LECTURES.forEach(l=>{ if(totalMcq(l)>0) examSelectedLectures.add(l.id); });
    }
    wrap.innerHTML = LECTURES.filter(l=>totalMcq(l)>0).map(l=>
      `<button class="chip ${examSelectedLectures.has(l.id)?'active':''}" data-lec="${l.id}">${toBn(l.id)}</button>`
    ).join('');
    wrap.querySelectorAll('.chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        const id = parseInt(chip.dataset.lec);
        if(examSelectedLectures.has(id)) examSelectedLectures.delete(id);
        else examSelectedLectures.add(id);
        chip.classList.toggle('active');
        updateExamAvail();
      });
    });

    document.querySelectorAll('#exam-count-chips .chip').forEach(chip=>{
      chip.classList.toggle('active', parseInt(chip.dataset.count)===examSelectedCount);
      chip.onclick = ()=>{
        examSelectedCount = parseInt(chip.dataset.count);
        document.querySelectorAll('#exam-count-chips .chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        updateExamAvail();
      };
    });

    updateExamAvail();
    renderExamHistoryMini();
  }

  function availableExamPool(){
    let pool = [];
    LECTURES.forEach(l=>{
      if(!examSelectedLectures.has(l.id)) return;
      (l.mcqSets||[]).forEach(set=>{
        set.questions.forEach(q=> pool.push(Object.assign({lectureId:l.id}, q)));
      });
    });
    return pool;
  }

  function updateExamAvail(){
    const pool = availableExamPool();
    document.getElementById('exam-avail').textContent =
      'নির্বাচিত লেকচার থেকে মোট '+toBn(pool.length)+'টি প্রশ্ন পাওয়া যাচ্ছে';
  }

  function renderExamHistoryMini(){
    const hist = getExamHistory().slice(0,3);
    const wrap = document.getElementById('exam-history-mini');
    if(hist.length===0){ wrap.innerHTML = '<div class="empty-state" style="padding:24px">এখনো কোনো পরীক্ষা দেওয়া হয়নি</div>'; return; }
    wrap.innerHTML = hist.map(h=>`
      <div class="exam-hist-item">
        <div>
          <div class="eh-main">${toBn(h.total)}টি প্রশ্ন</div>
          <div class="eh-sub">${h.dateLabel}</div>
        </div>
        <div class="eh-score">${toBn(h.scorePct)}%</div>
      </div>`).join('');
  }

  let examQuestions = [];
  let examAnswers = [];
  let examIndex = 0;
  let examStartTime = 0;
  let examTimerHandle = null;

  document.getElementById('exam-start-btn').addEventListener('click', ()=>{
    const pool = availableExamPool();
    if(pool.length===0){ alert('অন্তত একটি লেকচার নির্বাচন করুন।'); return; }
    const shuffled = [...pool].sort(()=>Math.random()-0.5);
    examQuestions = examSelectedCount>0 ? shuffled.slice(0, examSelectedCount) : shuffled;
    examAnswers = new Array(examQuestions.length).fill(null);
    examIndex = 0;
    examStartTime = Date.now();
    document.getElementById('exam-session-eyebrow').textContent = toBn(examQuestions.length)+'টি প্রশ্ন';
    navigateTo('exam-session');
    renderExamQuestion();
    startExamTimer();
  });

  function startExamTimer(){
    clearInterval(examTimerHandle);
    examTimerHandle = setInterval(()=>{
      const sec = Math.floor((Date.now()-examStartTime)/1000);
      const m = Math.floor(sec/60), s = sec%60;
      document.getElementById('exam-timer').textContent = toBn(String(m).padStart(2,'0'))+':'+toBn(String(s).padStart(2,'0'));
    }, 1000);
  }

  function renderExamQuestion(){
    const q = examQuestions[examIndex];
    const letters = ['ক','খ','গ','ঘ'];
    document.getElementById('exam-progress-label').textContent = toBn(examIndex+1)+'/'+toBn(examQuestions.length);
    document.getElementById('exam-progress-fill').style.width = ((examIndex+1)/examQuestions.length*100)+'%';
    document.getElementById('exam-qnum').textContent = 'প্রশ্ন '+toBn(examIndex+1);
    document.getElementById('exam-qtext').textContent = q.q;
    const optWrap = document.getElementById('exam-options');
    optWrap.innerHTML = q.options.map((opt,i)=>
      `<div class="option ${examAnswers[examIndex]===i?'selected':''}" data-i="${i}"><div class="letter">${letters[i]}</div><div>${opt}</div></div>`
    ).join('');
    optWrap.querySelectorAll('.option').forEach(opt=>{
      opt.addEventListener('click', ()=>{
        examAnswers[examIndex] = parseInt(opt.dataset.i);
        optWrap.querySelectorAll('.option').forEach(o=>o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    document.getElementById('exam-prev-btn').disabled = examIndex===0;
    const isLast = examIndex===examQuestions.length-1;
    document.getElementById('exam-next-btn').style.display = isLast ? 'none' : 'block';
    document.getElementById('exam-submit-btn').style.display = isLast ? 'block' : 'none';
  }

  document.getElementById('exam-prev-btn').addEventListener('click', ()=>{
    if(examIndex>0){ examIndex--; renderExamQuestion(); }
  });
  document.getElementById('exam-next-btn').addEventListener('click', ()=>{
    if(examIndex<examQuestions.length-1){ examIndex++; renderExamQuestion(); }
  });
  document.getElementById('exam-exit-btn').addEventListener('click', ()=>{
    if(confirm('পরীক্ষা থেকে বের হতে চান? অগ্রগতি সংরক্ষিত হবে না।')){
      clearInterval(examTimerHandle);
      history.back();
    }
  });
  document.getElementById('exam-submit-btn').addEventListener('click', ()=>{
    if(!confirm('আপনি কি নিশ্চিত পরীক্ষা জমা দিতে চান?')) return;
    clearInterval(examTimerHandle);
    finishExam();
  });

  function finishExam(){
    let correct=0, wrong=0, skip=0;
    examQuestions.forEach((q,i)=>{
      if(examAnswers[i]===null) skip++;
      else if(examAnswers[i]===q.answer) correct++;
      else wrong++;
    });
    const total = examQuestions.length;
    const scorePct = total>0 ? Math.round((correct/total)*100) : 0;
    const durationSec = Math.floor((Date.now()-examStartTime)/1000);
    const now = new Date();
    const record = {
      total, correct, wrong, skip, scorePct, durationSec,
      dateLabel: now.toLocaleDateString('bn-BD', {day:'numeric', month:'short', year:'numeric'}),
      timestamp: now.getTime()
    };
    saveExamResult(record);
    examQuestions.forEach((q,i)=>{
      recordPracticeAnswer(q.lectureId, examAnswers[i]===q.answer);
    });
    renderExamResult(record);
  }

  function renderExamResult(record){
    document.getElementById('result-pct').textContent = toBn(record.scorePct)+'%';
    document.getElementById('result-correct').textContent = toBn(record.correct);
    document.getElementById('result-wrong').textContent = toBn(record.wrong);
    document.getElementById('result-skip').textContent = toBn(record.skip);
    const m = Math.floor(record.durationSec/60), s = record.durationSec%60;
    document.getElementById('result-time').textContent = toBn(m)+':'+toBn(String(s).padStart(2,'0'));

    const circumference = 2*Math.PI*70;
    const offset = circumference - (record.scorePct/100)*circumference;
    const ring = document.getElementById('score-ring-fill');
    ring.setAttribute('stroke-dasharray', circumference);
    ring.setAttribute('stroke-dashoffset', offset);
    ring.setAttribute('stroke', record.scorePct>=60 ? 'var(--success)' : record.scorePct>=40 ? 'var(--gold)' : 'var(--danger)');

    const letters = ['ক','খ','গ','ঘ'];
    const reviewWrap = document.getElementById('result-review-list');
    reviewWrap.innerHTML = examQuestions.map((q,i)=>{
      const ans = examAnswers[i];
      let ansHtml;
      if(ans===null) ansHtml = `<div class="rv-ans skip">উত্তর দেওয়া হয়নি। সঠিক উত্তর: ${letters[q.answer]}. ${q.options[q.answer]}</div>`;
      else if(ans===q.answer) ansHtml = `<div class="rv-ans correct">আপনার উত্তর সঠিক: ${letters[ans]}. ${q.options[ans]}</div>`;
      else ansHtml = `<div class="rv-ans wrong">আপনার উত্তর: ${letters[ans]}. ${q.options[ans]}</div><div class="rv-ans correct">সঠিক উত্তর: ${letters[q.answer]}. ${q.options[q.answer]}</div>`;
      return `<div class="review-item"><div class="rv-q">${toBn(i+1)}. ${q.q}</div>${ansHtml}</div>`;
    }).join('');

    navigateTo('exam-result');
  }
  document.getElementById('result-retry-btn').addEventListener('click', ()=> history.back());

  /* ---------- STATS ---------- */
  function renderStats(){
    const hist = getExamHistory();
    document.getElementById('stat-total-exam').textContent = toBn(hist.length);
    const avg = hist.length ? Math.round(hist.reduce((s,h)=>s+h.scorePct,0)/hist.length) : 0;
    const best = hist.length ? Math.max(...hist.map(h=>h.scorePct)) : 0;
    document.getElementById('stat-avg-score').textContent = toBn(avg)+'%';
    document.getElementById('stat-best-score').textContent = toBn(best)+'%';

    const pStats = getPracticeStats();
    const attempted = Object.values(pStats).reduce((s,v)=>s+v.attempted,0);
    const correct = Object.values(pStats).reduce((s,v)=>s+v.correct,0);
    document.getElementById('stat-practice-attempted').textContent = toBn(attempted);
    document.getElementById('stat-practice-correct').textContent = toBn(correct);
    document.getElementById('stat-practice-accuracy').textContent = toBn(attempted ? Math.round((correct/attempted)*100) : 0)+'%';

    const barsWrap = document.getElementById('stats-lecture-bars');
    const activeLectures = LECTURES.filter(l=> pStats[String(l.id)] && pStats[String(l.id)].attempted>0);
    if(activeLectures.length===0){
      barsWrap.innerHTML = '<div class="empty-state" style="padding:20px">এখনো কোনো প্র্যাকটিস ডেটা নেই</div>';
    } else {
      barsWrap.innerHTML = activeLectures.map(l=>{
        const s = pStats[String(l.id)];
        const pct = Math.round((s.correct/s.attempted)*100);
        return `<div class="lec-bar-row">
          <div class="lec-bar-head"><span>লেকচার ${toBn(l.id)}</span><span>${toBn(pct)}% (${toBn(s.correct)}/${toBn(s.attempted)})</span></div>
          <div class="lec-bar-track"><div class="lec-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');
    }

    const histWrap = document.getElementById('stats-exam-history');
    if(hist.length===0){
      histWrap.innerHTML = '<div class="empty-state" style="padding:20px">এখনো কোনো পরীক্ষা দেওয়া হয়নি</div>';
    } else {
      histWrap.innerHTML = hist.map(h=>{
        const m = Math.floor(h.durationSec/60), s = h.durationSec%60;
        return `<div class="exam-hist-item">
          <div>
            <div class="eh-main">${toBn(h.total)}টি প্রশ্ন · ${toBn(h.correct)} সঠিক</div>
            <div class="eh-sub">${h.dateLabel} · ${toBn(m)}:${toBn(String(s).padStart(2,'0'))}</div>
          </div>
          <div class="eh-score">${toBn(h.scorePct)}%</div>
        </div>`;
      }).join('');
    }
  }
  document.getElementById('stats-reset-btn').addEventListener('click', ()=>{
    if(confirm('সব পরীক্ষা ও প্র্যাকটিস পরিসংখ্যান স্থায়ীভাবে মুছে ফেলা হবে। নিশ্চিত?')){
      storeSet(STORE_PRACTICE, {});
      storeSet(STORE_EXAM, []);
      renderStats();
      renderHomeStats();
    }
  });

  /* ---------- INIT ---------- */
  renderHomeStats();

})();
