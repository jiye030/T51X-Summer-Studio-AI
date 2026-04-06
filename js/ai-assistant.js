/* ── AI 설계 도우미 — 브라우저 직접 호출 방식 ── */

const _AI_KEY_STORE = '51x_anthropic_key';
const _AI_SYS = `당신은 T51X Summer Studio의 AI 설계 도우미입니다. 화면 기획이 처음인 사용자와 대화하며 어떤 화면을 만들지 파악하고, Studio 폼 설정 JSON을 생성하는 역할입니다.

[대화 원칙]
- 항상 한국어로 대화하세요.
- 쉽고 친절하게, 전문 용어 최소화.
- 한 번에 질문 하나만 하세요.
- 4~6번 대화 이내에 정보를 수집하세요.

[수집 순서]
1. 어떤 서비스/제품인가? (쇼핑몰, 여행 앱, 회사 소개 등)
2. 웹사이트인가 모바일 앱인가?
3. 어떤 화면을 만들고 싶은가?
4. 화면의 주요 정보와 사용자 행동은?
5. 특별한 분위기나 요구사항은?

[설정 생성] 충분한 정보가 모이면 "설정을 완성했어요!" 라고 알리고 아래 구분자 사이에 JSON을 출력하세요.
%%JSON_START%%
{"project":"...","client":"...","font":"Pretendard","resolution":"1920×1080px","notes":"...","ratio":"자유","wfStyle":"로우파이 (회색 계열)","responsive":"Desktop First (1920px 기준)","colorTheme":"흰색 배경 (#FFFFFF) + 검정 텍스트","gnb":"햄버거 메뉴 + 슬라이드 패널 우측 (T51형)","interaction":"기본 클릭 인터랙션 (Navigate To)","imageRule":"#EEEEEE 사각형 + 대각선 크로스","textRule":"한국어 Lorem 처리","accessibility":"기본 (별도 명시 없음)","footerType":"2단 — 로고+메뉴(좌) / 회사정보+SNS(우) (T51형)","pages":[{"id":"01","name":"페이지명","note":"특이사항","sections":[{"type":"SL-hero-fullscreen","note":""}]}]}
%%JSON_END%%

[선택 기준]
resolution: 모바일→"375×812px" / 웹→"1920×1080px"
ratio: 스크롤→"자유" / 고정슬라이드→"16:9"
responsive: 모바일→"Mobile First (375px 기준)" / 웹→"Desktop First (1920px 기준)"
gnb: "없음"/"햄버거 메뉴 + 슬라이드 패널 우측 (T51형)"/"햄버거 메뉴 + 슬라이드 패널 좌측"/"햄버거 메뉴 + 풀스크린 오버레이"/"풀 메뉴바 — 로고 좌측 + 메뉴 중앙"/"풀 메뉴바 — 로고 중앙 + 메뉴 양측"/"투명 메뉴바 (스크롤 시 배경 채움)"/"사이드바 고정 메뉴 (좌측 세로)"
colorTheme: "흰색 배경 (#FFFFFF) + 검정 텍스트"/"검정 배경 (#000000) + 흰색 텍스트"/"브랜드 컬러 적용 (별도 명시)"
footerType: 모바일→"없음" / 웹→"2단 — 로고+메뉴(좌) / 회사정보+SNS(우) (T51형)"
wfStyle: "순수 와이어프레임 (색상 없음)"/"로우파이 (회색 계열)"/"미드파이 (기본 색상 일부 적용)"/"하이파이 (실제 디자인에 가까운)"
sections type: SL-hero-fullscreen/SL-hero-split/SL-hero-image-overlay/SL-content-twocol/SL-content-singlecol/SL-grid-card3/SL-grid-card4/SL-stats-bar/SL-gallery-full/SL-form-contact/SL-form-apply/SL-filter-tabs/SL-pagination/SL-cta-banner/SL-logo-strip/SL-list-table/SL-list-accordion/커스텀`;

let _aiOpen = false, _aiHist = [], _aiLoading = false, _aiJSON = null;

// ── API 키 관리 ──
function _aiGetKey() { return localStorage.getItem(_AI_KEY_STORE) || ''; }
function _aiSaveKey(k) { localStorage.setItem(_AI_KEY_STORE, k.trim()); }

// ── 패널 토글 ──
function toggleAI() {
  _aiOpen = !_aiOpen;
  document.getElementById('ai-panel').classList.toggle('open', _aiOpen);
  if (_aiOpen) {
    const key = _aiGetKey();
    if (!key) {
      _showKeySetup();
    } else if (_aiHist.length === 0) {
      setTimeout(_aiGreet, 300);
    }
  }
}

function _showKeySetup() {
  document.getElementById('ai-key-setup').style.display = 'flex';
  document.getElementById('ai-chat-area').style.display = 'none';
  document.getElementById('ai-apply-bar').style.display = 'none';
  document.getElementById('ai-input-bar').style.display = 'none';
}

function _showChat() {
  document.getElementById('ai-key-setup').style.display = 'none';
  document.getElementById('ai-chat-area').style.display = 'flex';
  document.getElementById('ai-input-bar').style.display = 'flex';
}

function aiSaveKey() {
  const k = document.getElementById('ai-key-input').value.trim();
  if (!k.startsWith('sk-ant-')) {
    alert('API 키가 올바르지 않아요. sk-ant- 로 시작하는 키를 입력해주세요.');
    return;
  }
  _aiSaveKey(k);
  _showChat();
  if (_aiHist.length === 0) setTimeout(_aiGreet, 300);
}

function aiResetKey() {
  if (!confirm('API 키를 초기화할까요?')) return;
  localStorage.removeItem(_AI_KEY_STORE);
  _aiHist = []; _aiJSON = null;
  document.getElementById('ai-messages').innerHTML = '';
  document.getElementById('ai-key-input').value = '';
  document.getElementById('ai-apply-bar').style.display = 'none';
  _showKeySetup();
}

// ── 메시지 ──
function _aiGreet() {
  _aiBot('안녕하세요! 👋 AI 설계 도우미예요.\n\n어떤 서비스나 앱의 화면을 만들고 싶으신가요?\n예: "여행 예약 앱", "카페 웹사이트", "쇼핑몰 상품 상세"');
}

function _aiBot(txt) {
  const c = document.getElementById('ai-messages');
  const d = document.createElement('div'); d.className = 'ai-msg bot';
  d.innerHTML = `<div class="ai-icon">🤖</div><div class="ai-bubble">${txt.replace(/\n/g,'<br>')}</div>`;
  c.appendChild(d); c.scrollTop = c.scrollHeight;
}

function _aiUser(txt) {
  const c = document.getElementById('ai-messages');
  const d = document.createElement('div'); d.className = 'ai-msg user';
  d.innerHTML = `<div class="ai-bubble">${txt.replace(/\n/g,'<br>')}</div><div class="ai-icon">👤</div>`;
  c.appendChild(d); c.scrollTop = c.scrollHeight;
}

function _aiTyping() {
  const c = document.getElementById('ai-messages');
  const d = document.createElement('div'); d.className = 'ai-msg bot'; d.id = '_ait';
  d.innerHTML = `<div class="ai-icon">🤖</div><div class="ai-bubble"><div class="ai-dots"><span></span><span></span><span></span></div></div>`;
  c.appendChild(d); c.scrollTop = c.scrollHeight;
}

function _aiStopTyping() { const e = document.getElementById('_ait'); if (e) e.remove(); }

// ── API 호출 ──
async function sendAI() {
  const inp = document.getElementById('ai-inp');
  const txt = inp.value.trim();
  if (!txt || _aiLoading) return;

  const key = _aiGetKey();
  if (!key) { _showKeySetup(); return; }

  inp.value = ''; inp.style.height = 'auto';
  _aiUser(txt);
  _aiHist.push({ role: 'user', content: txt });
  _aiLoading = true;
  document.getElementById('ai-send').disabled = true;
  _aiTyping();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: _AI_SYS,
        messages: _aiHist
      })
    });

    if (res.status === 401) {
      _aiStopTyping();
      _aiBot('API 키가 올바르지 않아요. 키를 다시 확인해주세요.');
      setTimeout(aiResetKey, 1500);
      _aiLoading = false;
      document.getElementById('ai-send').disabled = false;
      return;
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text || '죄송해요, 다시 시도해주세요.';
    _aiHist.push({ role: 'assistant', content: reply });
    _aiStopTyping();

    const m = reply.match(/%%JSON_START%%([\s\S]*?)%%JSON_END%%/);
    if (m) {
      try {
        _aiJSON = JSON.parse(m[1].trim());
        const msg = reply.replace(/%%JSON_START%%[\s\S]*?%%JSON_END%%/, '').trim();
        _aiBot(msg || '설정을 완성했어요! 🎉 아래 버튼을 눌러 적용해주세요.');
        document.getElementById('ai-apply-bar').style.display = 'block';
        document.getElementById('ai-inp').disabled = true;
        document.getElementById('ai-send').disabled = true;
        return;
      } catch(e) { _aiBot(reply); }
    } else {
      _aiBot(reply);
    }
  } catch(e) {
    _aiStopTyping();
    _aiBot('연결에 실패했어요. 인터넷 연결을 확인해주세요. 🙏');
  }

  _aiLoading = false;
  document.getElementById('ai-send').disabled = false;
  document.getElementById('ai-inp').focus();
}

// ── 설정 적용 ──
function applyAI() {
  if (!_aiJSON) return;
  const s = _aiJSON;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  set('p-project', s.project || ''); set('p-client', s.client || '');
  set('p-font', s.font || 'Pretendard'); set('p-resolution', s.resolution || '1920×1080px');
  set('p-notes', s.notes || ''); set('p-ratio', s.ratio || '자유');
  set('p-wf-style', s.wfStyle || '로우파이 (회색 계열)');
  set('p-responsive', s.responsive || 'Desktop First (1920px 기준)');
  set('p-color-theme', s.colorTheme || '흰색 배경 (#FFFFFF) + 검정 텍스트');
  set('p-gnb', s.gnb || '없음');
  set('p-interaction', s.interaction || '기본 클릭 인터랙션 (Navigate To)');
  set('p-image-rule', s.imageRule || '#EEEEEE 사각형 + 대각선 크로스');
  set('p-text-rule', s.textRule || '한국어 Lorem 처리');
  set('p-accessibility', s.accessibility || '기본 (별도 명시 없음)');
  set('p-footer-type', s.footerType || '없음');
  if (typeof onFooterTypeChange === 'function') onFooterTypeChange();
  if (Array.isArray(s.pages) && s.pages.length > 0) {
    promptPages = []; pageSections = {};
    s.pages.forEach(p => {
      promptPages.push({ id: p.id, name: p.name, note: p.note || '' });
      pageSections[p.id] = (p.sections || []).map(sec => ({ type: sec.type || '커스텀', note: sec.note || '' }));
    });
    _activePageTab = promptPages[0]?.id || null;
    if (typeof renderPromptPageList === 'function') renderPromptPageList();
    if (typeof renderPageSectionTabs === 'function') renderPageSectionTabs();
    if (typeof updateCounters === 'function') updateCounters();
  }
  if (typeof triggerAutoSave === 'function') triggerAutoSave();
  toggleAI();
  if (typeof showToast === 'function') showToast('✅ AI 설정이 적용됐어요!');
  setTimeout(() => {
    const t = document.querySelector('.nav-tab[onclick*="prompt"]');
    if (t) t.click();
    if (typeof switchStepTab === 'function') switchStepTab(1);
  }, 300);
}

// ── Enter 전송 ──
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('ai-inp');
  if (inp) {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAI(); } });
    inp.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = Math.min(this.scrollHeight, 80) + 'px'; });
  }
});
