(function(){

  /* ---------- NAVIGATION ---------- */
  const SCREEN_IDS = ['home','lectures','theory','mcq-picker','mcq','short-picker','short','timeline','exam','stats'];
  function showScreen(name){
    SCREEN_IDS.forEach(id=>{
      const el = document.getElementById('screen-'+id);
      if(el) el.classList.toggle('active', id===name);
    });
    window.scrollTo(0,0);
  }
  document.querySelectorAll('[data-nav]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const target = el.dataset.nav;
      if(target==='lectures') renderLectureList();
      if(target==='mcq-picker') renderPickerList('mcq-picker-list', l=>totalMcq(l)>0, openMcqLecture, 'MCQ');
      if(target==='short-picker') renderPickerList('short-picker-list', l=>l.theoryFacts.length>0, openShortLecture, 'থিওরি');
      if(target==='timeline') renderTimeline();
      showScreen(target);
    });
  });
  document.querySelectorAll('[data-back]').forEach(el=>{
    el.addEventListener('click', ()=> showScreen(el.dataset.back));
  });

  function totalMcq(lecture){
    return (lecture.mcqSets||[]).reduce((sum,s)=>sum+s.questions.length,0);
  }

  /* ---------- HOME STATS ---------- */
  function renderHomeStats(){
    const doneLectures = LECTURES.filter(l=>l.theoryFacts.length>0 || totalMcq(l)>0).length;
    const totalQ = LECTURES.reduce((s,l)=>s+totalMcq(l),0);
    document.getElementById('stat-lectures').textContent = toBn(doneLectures);
    document.getElementById('stat-mcq').textContent = toBn(totalQ);
    document.getElementById('stat-exam').textContent = toBn(0);
  }
  const bnDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  function toBn(n){ return String(n).split('').map(c=> /\d/.test(c) ? bnDigits[c] : c).join(''); }

  /* ---------- LECTURE LIST ---------- */
  function renderLectureList(){
    const wrap = document.getElementById('lecture-list');
    wrap.innerHTML = LECTURES.map(l=>{
      const qCount = totalMcq(l);
      const fCount = l.theoryFacts.length;
      const status = (qCount>0 || fCount>0) ? (fCount+' থিওরি · '+qCount+' MCQ') : 'শীঘ্রই যুক্ত হবে';
      return `<div class="list-item" data-open-lecture="${l.id}">
        <div class="li-num">${toBn(l.id)}</div>
        <div class="li-main">
          <div class="li-title">${l.title}</div>
          <div class="li-sub">${l.era} · ${toBn(status.replace(/\d+/g, m=>m))}</div>
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
        if(lecture.theoryFacts.length===0 && totalMcq(lecture)===0){
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
      const sub = kind==='MCQ' ? (toBn(totalMcq(l))+' টি প্রশ্ন') : (toBn(l.theoryFacts.length)+' টি তথ্য');
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

  /* ---------- THEORY ---------- */
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
    (lecture.theoryFacts||[]).forEach(f=>{
      html += `<div class="fact-card"><div class="fact-q">${f.q}</div><div class="fact-a">${f.a}</div></div>`;
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
    showScreen('theory');
  }
  function openShortLecture(lecture){ openTheory(lecture); document.querySelector('#screen-theory .h1b').textContent='থিওরি নোট'; }

  /* ---------- MCQ PRACTICE ---------- */
  let currentQuiz = [];
  let currentIndex = 0;
  let currentLectureTitle = '';

  function openMcqLecture(lecture){
    currentQuiz = [];
    (lecture.mcqSets||[]).forEach(set=>{
      set.questions.forEach(q=> currentQuiz.push(Object.assign({setName:set.name}, q)));
    });
    currentIndex = 0;
    currentLectureTitle = lecture.title;
    document.getElementById('mcq-eyebrow').textContent = 'লেকচার '+toBn(lecture.id);
    if(currentQuiz.length===0){ alert('এই লেকচারের MCQ শীঘ্রই যুক্ত হবে।'); return; }
    showScreen('mcq');
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

    item.facts.forEach((fact,i)=>{
      const angle = (2*Math.PI*i/n) - Math.PI/2;
      const x = cx + radius*Math.cos(angle);
      const y = cy + radius*Math.sin(angle);

      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', x); line.setAttribute('y2', y);
      line.setAttribute('stroke', 'rgba(184,134,11,0.5)');
      line.setAttribute('stroke-width', '1.5');
      linesEl.appendChild(line);

      const chip = document.createElement('div');
      chip.className = 'orbit-chip';
      chip.style.left = x+'px';
      chip.style.top = y+'px';
      chip.textContent = fact;
      stage.appendChild(chip);
    });

    overlay.classList.add('active');
  }
  document.getElementById('orbit-close').addEventListener('click', ()=> overlay.classList.remove('active'));
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.classList.remove('active'); });

  /* ---------- INIT ---------- */
  renderHomeStats();

})();
