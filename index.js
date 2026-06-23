
(function () {
  'use strict';

  const EXT_ID = 'st_quick_commands_safe';
  const STORAGE_KEY = 'st_quick_commands_safe_v3';

  const DEFAULT = {
    enabled: true,
    appendPosition: 'bottom',
    activeModeId: 'normal',
    commands: [
      { id:'npc_drive', title:'NPC推剧情', enabled:true, text:'$若有其他人物在场时，{{char}}需要赋予他们语言或者动作神态，用以推动剧情' },
      { id:'ability_consistency', title:'能力一致', enabled:true, text:'$禁止为戏剧效果临时提升或降低角色、神器、NPC能力。\n$所有力量、武功、内力、神器效果必须与既有设定一致。若需要达成剧情结果，优先透过时机、技巧、情绪、立场与行动完成，而非突然爆种。' },
      { id:'memory_consistency', title:'记忆一致', enabled:true, text:'$角色不得遗忘已确认事实、关系、身份与剧情结果。已恢复的记忆不得反复失忆或重新疑惑。' },
      { id:'map_consistency', title:'地图一致', enabled:true, text:'$优先使用世界书既有地名、势力、建筑与制度。若必须新增地名，需符合现有世界观命名风格，避免通用网文名。' },
      { id:'no_user_acting', title:'不代赵语璃', enabled:true, text:'$指令：只对赵语璃以外角色进行角色扮演\n$指令：禁止替赵语璃进行对话、发言、表情、动作和内心想法的描写，禁止以赵语璃发的话做描写' },
      { id:'anti_epic', title:'反史诗化', enabled:false, text:'$避免无意义夸张描写与史诗化套语。\n$禁止频繁使用「排山倒海」「海啸般」「洪流般」「撕裂神魂」「毁天灭地」「震碎虚空」等夸张表达。优先使用符合场景与人物能力的描写。' }
    ],
    modes: [
      { id:'normal', title:'普通', text:'' },
      { id:'angst', title:'虐恋', text:'$当前为高烈度虐恋火葬场模式。允许强情绪爆发，但必须转化为行动、补救、牺牲与选择，禁止只重复痛苦、吐血、下跪、崩溃。' },
      { id:'shenjie', title:'神界', text:'$当前允许逐步触发神界线。神界信息必须通过神器异动、梦境、残卷、圣灵反应、轮回痕迹逐步揭露，不得让凡人角色无故全知。' },
      { id:'liujie', title:'六界', text:'$当前允许使用六界暗线。六界设定仍需保持隐藏线逻辑，未被触发的角色不得突然知道真相。' }
    ]
  };

  let state = loadState();
  let panelOpen = false;
  let sending = false;

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(DEFAULT);
      const parsed = JSON.parse(raw);
      return {
        ...clone(DEFAULT),
        ...parsed,
        commands: Array.isArray(parsed.commands) ? parsed.commands : clone(DEFAULT.commands),
        modes: Array.isArray(parsed.modes) ? parsed.modes : clone(DEFAULT.modes),
      };
    } catch {
      return clone(DEFAULT);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function findTextarea() {
    return document.querySelector('#send_textarea')
      || document.querySelector('textarea#send_textarea')
      || document.querySelector('#send_form textarea')
      || document.querySelector('textarea[name="text"]')
      || document.querySelector('textarea');
  }

  function findSendButton() {
    return document.querySelector('#send_but')
      || document.querySelector('#send_button')
      || document.querySelector('.send_but')
      || document.querySelector('[data-testid="send-button"]');
  }

  function setValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function activeText() {
    if (!state.enabled) return '';
    const arr = (state.commands || [])
      .filter(c => c.enabled && (c.text || '').trim())
      .map(c => c.text.trim());
    const mode = (state.modes || []).find(m => m.id === state.activeModeId);
    if (mode && mode.text && mode.text.trim()) arr.push(mode.text.trim());
    return arr.join('\n');
  }

  function buildMessage(original) {
    const cmd = activeText();
    if (!cmd || !original.trim()) return original;
    if (original.includes('<!-- ST_QUICK_COMMANDS_SAFE -->')) return original;
    if (state.appendPosition === 'top') {
      return '<!-- ST_QUICK_COMMANDS_SAFE -->\n' + cmd + '\n\n' + original;
    }
    return original + '\n\n<!-- ST_QUICK_COMMANDS_SAFE -->\n' + cmd;
  }

  function beforeSend() {
    const ta = findTextarea();
    if (!ta) return;
    const original = ta.value || '';
    const next = buildMessage(original);
    if (next !== original) setValue(ta, next);
  }

  function safeSend() {
    if (sending) return;
    sending = true;

    beforeSend();

    setTimeout(() => {
      const btn = findSendButton();
      if (btn) btn.click();
      else {
        const ta = findTextarea();
        if (ta) ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
      setTimeout(() => { sending = false; }, 800);
    }, 30);
  }

  function makeFloatingButton() {
    if (document.getElementById(EXT_ID + '_float')) return;

    const btn = document.createElement('button');
    btn.id = EXT_ID + '_float';
    btn.type = 'button';
    btn.textContent = '🎛';
    btn.title = '快捷指令';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    });
    document.body.appendChild(btn);
  }

  function makePanel() {
    if (document.getElementById(EXT_ID + '_panel')) return;

    const panel = document.createElement('div');
    panel.id = EXT_ID + '_panel';
    panel.innerHTML = `
      <div class="sqc-header">
        <b>🎛 快捷指令 Safe</b>
        <button type="button" id="sqc_close">×</button>
      </div>

      <div class="sqc-card">
        <label><input id="sqc_enabled" type="checkbox"> 启用</label>
        <label>插入位置：
          <select id="sqc_position">
            <option value="bottom">正文后面</option>
            <option value="top">正文前面</option>
          </select>
        </label>
        <button type="button" id="sqc_send">附加指令并发送</button>
      </div>

      <div class="sqc-section-title">模式</div>
      <div id="sqc_modes"></div>

      <div class="sqc-section-title">常驻指令</div>
      <div class="sqc-actions">
        <button type="button" id="sqc_add">＋新增</button>
        <button type="button" id="sqc_export">导出</button>
        <button type="button" id="sqc_import">导入</button>
      </div>
      <textarea id="sqc_import_box" style="display:none" placeholder="贴上导出的 JSON 后再按导入"></textarea>
      <div id="sqc_list"></div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#sqc_close').onclick = closePanel;
    panel.querySelector('#sqc_enabled').onchange = e => { state.enabled = e.target.checked; saveState(); };
    panel.querySelector('#sqc_position').onchange = e => { state.appendPosition = e.target.value; saveState(); };
    panel.querySelector('#sqc_send').onclick = safeSend;
    panel.querySelector('#sqc_add').onclick = () => {
      state.commands.push({ id: String(Date.now()), title: '新指令', enabled: true, text: '$指令：' });
      saveState();
      render();
    };
    panel.querySelector('#sqc_export').onclick = async () => {
      const s = JSON.stringify(state, null, 2);
      try {
        await navigator.clipboard.writeText(s);
        alert('已复制');
      } catch {
        prompt('复制 JSON：', s);
      }
    };
    panel.querySelector('#sqc_import').onclick = () => {
      const box = panel.querySelector('#sqc_import_box');
      if (box.style.display === 'none') {
        box.style.display = 'block';
        box.focus();
        return;
      }
      try {
        const x = JSON.parse(box.value);
        if (!Array.isArray(x.commands)) throw new Error('bad json');
        state = { ...clone(DEFAULT), ...x };
        saveState();
        box.value = '';
        box.style.display = 'none';
        render();
        alert('导入完成');
      } catch {
        alert('JSON 格式错误');
      }
    };

    render();
  }

  function renderModes() {
    const wrap = document.getElementById('sqc_modes');
    if (!wrap) return;
    wrap.innerHTML = '';
    (state.modes || []).forEach(mode => {
      const label = document.createElement('label');
      label.className = 'sqc-mode';
      label.innerHTML = '<input name="sqc_mode" type="radio"> <span></span>';
      label.querySelector('input').checked = state.activeModeId === mode.id;
      label.querySelector('span').textContent = mode.title;
      label.querySelector('input').onchange = () => {
        state.activeModeId = mode.id;
        saveState();
        render();
      };
      wrap.appendChild(label);
    });
  }

  function render() {
    const panel = document.getElementById(EXT_ID + '_panel');
    if (!panel) return;

    panel.querySelector('#sqc_enabled').checked = !!state.enabled;
    panel.querySelector('#sqc_position').value = state.appendPosition || 'bottom';
    renderModes();

    const list = panel.querySelector('#sqc_list');
    list.innerHTML = '';

    (state.commands || []).forEach((cmd, i) => {
      const item = document.createElement('div');
      item.className = 'sqc-command';
      item.innerHTML = `
        <div class="sqc-top">
          <label><input class="e" type="checkbox"> 用</label>
          <input class="t" type="text">
          <button type="button" class="u">↑</button>
          <button type="button" class="d">↓</button>
          <button type="button" class="x">删</button>
        </div>
        <textarea class="txt"></textarea>
      `;

      item.querySelector('.e').checked = !!cmd.enabled;
      item.querySelector('.t').value = cmd.title || '';
      item.querySelector('.txt').value = cmd.text || '';

      item.querySelector('.e').onchange = e => { cmd.enabled = e.target.checked; saveState(); };
      item.querySelector('.t').oninput = e => { cmd.title = e.target.value; saveState(); };
      item.querySelector('.txt').oninput = e => { cmd.text = e.target.value; saveState(); };
      item.querySelector('.x').onclick = () => {
        if (confirm('删除？')) {
          state.commands.splice(i, 1);
          saveState();
          render();
        }
      };
      item.querySelector('.u').onclick = () => {
        if (i > 0) {
          const m = state.commands.splice(i, 1)[0];
          state.commands.splice(i - 1, 0, m);
          saveState();
          render();
        }
      };
      item.querySelector('.d').onclick = () => {
        if (i < state.commands.length - 1) {
          const m = state.commands.splice(i, 1)[0];
          state.commands.splice(i + 1, 0, m);
          saveState();
          render();
        }
      };

      list.appendChild(item);
    });
  }

  function openPanel() {
    makePanel();
    document.getElementById(EXT_ID + '_panel').classList.add('open');
    panelOpen = true;
    render();
  }

  function closePanel() {
    const panel = document.getElementById(EXT_ID + '_panel');
    if (panel) panel.classList.remove('open');
    panelOpen = false;
  }

  function togglePanel() {
    panelOpen ? closePanel() : openPanel();
  }

  function bindSendInterceptor() {
    document.addEventListener('click', e => {
      const t = e.target;
      if (!t || !t.closest) return;
      const btn = t.closest('#send_but, #send_button, .send_but, [data-testid="send-button"]');
      if (btn && !sending) beforeSend();
    }, true);

    document.addEventListener('keydown', e => {
      const ta = findTextarea();
      if (e.target === ta && e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        beforeSend();
      }
    }, true);
  }

  function boot() {
    makeFloatingButton();
    makePanel();
    bindSendInterceptor();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
